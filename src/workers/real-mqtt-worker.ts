import 'dotenv/config';
import * as mqtt from 'mqtt';
import { db } from '../db';
import { devicesTable, usersTable, deviceSensorsTable, assetGeofenceAssignmentsTable, geofenceAlertRulesTable } from '../db/schema';
import { eq, isNotNull, count } from 'drizzle-orm';
import { insertTelemetryEvent } from '../../lib/services/telemetry-service';
import { evaluateGeofencePositions } from '../../lib/services/geofence-service';
import {
  loadGeofenceAlertRules,
  createGeofenceAlert,
  createAlertNotification,
  updateDeviceStatus,
  AlertRule,
} from '../../lib/services/alert-service';

// ─── Config ──────────────────────────────────────────────────────────────────

const BROKER_URL = 'mqtt://24.199.126.227:1883';
const TOPIC      = 'techforge/node1/position';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NodePayload {
  latitude:  number;
  longitude: number;
  altitude:  number;
  hdop:      number;
  sensor_id: number;
}

interface DeviceInfo {
  id:        bigint;
  name:      string;
  userId:    bigint;
  userEmail: string;
}

// ─── State maps (reset on worker restart) ────────────────────────────────────

const geofenceStateMap = new Map<string, boolean | null>();
const entryTimeMap     = new Map<string, Date>();
const lastAlertTimeMap = new Map<string, Date>();
const rulesCache       = new Map<string, AlertRule[]>();

const subjectMap: Record<string, string> = {
  boundary_entry: 'Entrada a geocerca',
  boundary_exit:  'Salida de geocerca',
  dwell_time:     'Permanencia en geocerca',
};

// ─── Device lookup by sensor_id ──────────────────────────────────────────────

async function buildSensorDeviceMap(): Promise<Map<number, DeviceInfo>> {
  const rows = await db
    .select({
      sensorId:  deviceSensorsTable.sensorId,
      id:        devicesTable.id,
      name:      devicesTable.name,
      userId:    devicesTable.userId,
      userEmail: usersTable.email,
    })
    .from(deviceSensorsTable)
    .innerJoin(devicesTable, eq(deviceSensorsTable.deviceId, devicesTable.id))
    .innerJoin(usersTable,   eq(devicesTable.userId, usersTable.id))
    .where(eq(devicesTable.active, true));

  const map = new Map<number, DeviceInfo>();
  for (const row of rows) {
    map.set(row.sensorId, {
      id:        row.id,
      name:      row.name,
      userId:    row.userId,
      userEmail: row.userEmail,
    });
  }
  return map;
}

// ─── Startup diagnostics ─────────────────────────────────────────────────────

async function diagnoseSetup(devices: DeviceInfo[]): Promise<void> {
  console.log('\n🔍 Diagnóstico de setup:');

  // 1. Check devices have assetId
  const devicesWithAsset = await db
    .select({ id: devicesTable.id, name: devicesTable.name, assetId: devicesTable.assetId })
    .from(devicesTable)
    .where(isNotNull(devicesTable.assetId));

  const devicesWithoutAsset = devices.filter(
    (d) => !devicesWithAsset.find((da) => da.id === d.id)
  );

  if (devicesWithoutAsset.length > 0) {
    console.warn(`  ⚠️  Devices sin assetId (geofencing deshabilitado): ${devicesWithoutAsset.map((d) => d.name).join(', ')}`);
    console.warn('     → Vincular assets a dispositivos en la BD.');
  } else {
    console.log(`  ✅ Todos los devices tienen assetId asignado`);
  }

  // 2. Check active geofence assignments
  const [assignmentsCount] = await db
    .select({ n: count() })
    .from(assetGeofenceAssignmentsTable)
    .where(eq(assetGeofenceAssignmentsTable.isActive, true));

  if (Number(assignmentsCount.n) === 0) {
    console.warn('  ⚠️  No hay asset_geofence_assignments activas → no se evaluarán geocercas.');
  } else {
    console.log(`  ✅ ${assignmentsCount.n} asignación(es) activa(s) en asset_geofence_assignments`);
  }

  // 3. Check alert rules
  const [rulesCount] = await db
    .select({ n: count() })
    .from(geofenceAlertRulesTable)
    .where(eq(geofenceAlertRulesTable.active, true));

  if (Number(rulesCount.n) === 0) {
    console.warn('  ⚠️  No hay geofence_alert_rules activas → no se generarán alertas.');
  } else {
    console.log(`  ✅ ${rulesCount.n} regla(s) de alerta activa(s)`);
  }

  console.log('');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getOrLoadRules(geofenceId: bigint): Promise<AlertRule[]> {
  const key = geofenceId.toString();
  if (!rulesCache.has(key)) {
    const rules = await loadGeofenceAlertRules(geofenceId);
    rulesCache.set(key, rules);
    if (rules.length === 0) {
      console.warn(`  ⚠️  Sin reglas de alerta para geofence ID ${geofenceId}`);
    }
  }
  return rulesCache.get(key)!;
}

function dwellThresholdMs(rule: AlertRule): number {
  if (rule.thresholdValue && rule.thresholdUnit) {
    const val = parseFloat(rule.thresholdValue);
    switch (rule.thresholdUnit) {
      case 'seconds': return val * 1_000;
      case 'minutes': return val * 60_000;
      case 'hours':   return val * 3_600_000;
    }
  }
  return rule.minimumDuration > 0 ? rule.minimumDuration : 1_800_000;
}

async function fireAlert(
  conditionType: string,
  device: DeviceInfo,
  geofenceId: bigint,
  geofenceName: string,
  trackingEventId: bigint,
  lat: number,
  lng: number,
  timestamp: Date,
  message: string,
  rules: AlertRule[]
): Promise<void> {
  const rule = rules.find((r) => r.conditionType === conditionType && r.active);
  if (!rule) {
    console.warn(`  ⚠️  Sin regla activa para conditionType='${conditionType}' en geofence '${geofenceName}'`);
    return;
  }

  // Cooldown check
  const cooldownKey = `${device.id}:${geofenceId}:${conditionType}`;
  const lastAlert = lastAlertTimeMap.get(cooldownKey);
  if (lastAlert && (timestamp.getTime() - lastAlert.getTime()) < rule.cooldownPeriod * 1000) {
    console.log(`  ⏳ [${conditionType}] En cooldown para '${device.name}' / '${geofenceName}'`);
    return;
  }

  // Create alert
  const alert = await createGeofenceAlert({
    alertTypeId:    rule.alertTypeId,
    deviceId:       device.id,
    geofenceId,
    trackingEventId,
    lat,
    lng,
    alertTimestamp: timestamp,
    message,
    severity:       rule.priority,
  });
  console.log(`  🚨 Alert creado: ID ${alert.id} [${conditionType}] → '${geofenceName}'`);

  const subject    = `[ALERT] ${device.name} — ${subjectMap[conditionType] ?? conditionType}`;
  const channels   = rule.notificationChannels.length > 0 ? rule.notificationChannels : ['in_app'];
  const recipients = rule.notifyUsers.length > 0 ? rule.notifyUsers : [String(device.userId)];

  for (const channel of channels) {
    for (const _userId of recipients) {
      await createAlertNotification({
        alertId:            alert.id,
        alertTimestamp:     alert.alertTimestamp,
        userId:             device.userId,
        userEmail:          device.userEmail,
        deviceName:         device.name,
        message,
        notificationMethod: channel,
        subject,
      });
    }
  }

  lastAlertTimeMap.set(cooldownKey, timestamp);
  console.log(`  🔔 Notificación enviada (${channels.join(',')}) → ${device.userEmail}`);
}

// ─── GPS event handler ────────────────────────────────────────────────────────

async function handleGpsEvent(
  payload: NodePayload,
  sensorDeviceMap: Map<number, DeviceInfo>
): Promise<void> {
  const { latitude, longitude, altitude, sensor_id } = payload;

  const device = sensorDeviceMap.get(sensor_id);
  if (!device) {
    console.warn(`❓ sensor_id ${sensor_id} no está vinculado a ningún dispositivo activo`);
    return;
  }

  const now = new Date();

  // Insert telemetry event
  const event = await insertTelemetryEvent(
    device.id,
    sensor_id,
    latitude,
    longitude,
    altitude,
    now,
    payload as unknown as Record<string, unknown>,
  );
  console.log(
    `📍 [${device.name}] Event #${event.id} ` +
    `lat=${latitude} lng=${longitude} alt=${altitude} hdop=${payload.hdop}`
  );

  // Evaluate geofences
  const evaluations = await evaluateGeofencePositions(device.id, latitude, longitude, now);

  if (evaluations.length === 0) {
    console.log(`  ↳ Sin geocercas activas para este device (assetId no vinculado o sin asignaciones)`);
    return;
  }

  for (const ev of evaluations) {
    const stateKey   = `${device.id}:${ev.geofenceId}`;
    const prevState  = geofenceStateMap.get(stateKey) ?? null;
    const currInside = ev.isInside;

    const locInfo = ev.geofenceTypeName === 'circular'
      ? `dist: ${ev.distanceMeters.toFixed(0)}m / radius: ${ev.radiusMeters}m`
      : `type: ${ev.geofenceTypeName}`;
    console.log(`  ↳ [${ev.geofenceName}] ${locInfo} → ${currInside ? 'INSIDE' : 'OUTSIDE'}`);

    // First tick: establish baseline
    if (prevState === null) {
      geofenceStateMap.set(stateKey, currInside);
      if (currInside) entryTimeMap.set(stateKey, now);
      console.log(`  ↳ [baseline] '${ev.geofenceName}': ${currInside ? 'inside' : 'outside'}`);
      continue;
    }

    geofenceStateMap.set(stateKey, currInside);
    const rules = await getOrLoadRules(ev.geofenceId);

    // --- ENTRY ---
    if (!prevState && currInside) {
      entryTimeMap.set(stateKey, now);
      if (ev.alertOnEntry) {
        const geoDetail = ev.geofenceTypeName === 'circular'
          ? `. Distance: ${ev.distanceMeters.toFixed(0)}m (radius: ${ev.radiusMeters}m)`
          : '';
        const message = `Device '${device.name}' entered geofence '${ev.geofenceName}'${geoDetail}`;
        console.log(`  ✅ ENTRY: '${device.name}' → '${ev.geofenceName}'`);
        await fireAlert('boundary_entry', device, ev.geofenceId, ev.geofenceName, event.id, latitude, longitude, now, message, rules);
        await updateDeviceStatus(device.id, 'active');
      }
    }

    // --- EXIT ---
    if (prevState && !currInside) {
      entryTimeMap.delete(stateKey);
      if (ev.alertOnExit) {
        const geoDetail = ev.geofenceTypeName === 'circular'
          ? `. Distance: ${ev.distanceMeters.toFixed(0)}m (radius: ${ev.radiusMeters}m)`
          : '';
        const message = `Device '${device.name}' exited geofence '${ev.geofenceName}'${geoDetail}`;
        console.log(`  🚨 EXIT: '${device.name}' → '${ev.geofenceName}'`);
        await fireAlert('boundary_exit', device, ev.geofenceId, ev.geofenceName, event.id, latitude, longitude, now, message, rules);
        await updateDeviceStatus(device.id, 'alert');
      }
    }

    // --- DWELL ---
    if (currInside && ev.alertOnDwell) {
      const entryTime = entryTimeMap.get(stateKey);
      if (entryTime) {
        const dwellRule = rules.find((r) => r.conditionType === 'dwell_time' && r.active);
        if (dwellRule) {
          const dwellMs   = now.getTime() - entryTime.getTime();
          const threshold = dwellThresholdMs(dwellRule);
          if (dwellMs >= threshold) {
            const dwellMin = Math.floor(dwellMs / 60_000);
            const message  = `Device '${device.name}' has been inside geofence '${ev.geofenceName}' for ${dwellMin}m.`;
            console.log(`  ⏱️ DWELL: '${device.name}' lleva ${dwellMin}m dentro de '${ev.geofenceName}'`);
            await fireAlert('dwell_time', device, ev.geofenceId, ev.geofenceName, event.id, latitude, longitude, now, message, rules);
          }
        }
      }
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🚀 Starting real MQTT worker...');

  const sensorDeviceMap = await buildSensorDeviceMap();
  console.log(`📟 Loaded ${sensorDeviceMap.size} sensor→device mapping(s)`);

  if (sensorDeviceMap.size === 0) {
    console.warn('⚠️  No se encontraron sensores vinculados a dispositivos activos.');
    console.warn('   → Verifica que existan registros en device_sensors y devices.active = true');
  }

  await diagnoseSetup(Array.from(sensorDeviceMap.values()));

  const client = mqtt.connect(BROKER_URL);

  client.on('connect', () => {
    console.log(`✅ Conectado a ${BROKER_URL}`);
    client.subscribe(TOPIC, (err) => {
      if (err) {
        console.error('Error al suscribirse al topic:', err);
      } else {
        console.log(`📡 Suscrito a topic: ${TOPIC}\n`);
      }
    });
  });

  client.on('message', async (topic, rawMessage) => {
    let payload: NodePayload;

    try {
      payload = JSON.parse(rawMessage.toString()) as NodePayload;
    } catch {
      console.warn(`⚠️  Mensaje no-JSON en topic '${topic}':`, rawMessage.toString());
      return;
    }

    try {
      await handleGpsEvent(payload, sensorDeviceMap);
    } catch (err) {
      console.error(`❌ Error procesando evento GPS:`, err);
    }
  });

  client.on('error', (err) => {
    console.error('❌ Error de conexión MQTT:', err.message);
  });

  client.on('reconnect', () => {
    console.log('🔄 Reconectando al broker...');
  });

  client.on('close', () => {
    console.log('🔌 Conexión cerrada');
  });

  process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando worker...');
    client.end();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
