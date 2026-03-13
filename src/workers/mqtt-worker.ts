import 'dotenv/config';
import { db } from '../db';
import { devicesTable, usersTable, assetGeofenceAssignmentsTable, geofenceAlertRulesTable } from '../db/schema';
import { eq, isNotNull, count } from 'drizzle-orm';
import { createMqttBus, subscribe, startSimulator, GpsPayload } from './mock-mqtt';
import { insertTelemetryEvent } from '../../lib/services/telemetry-service';
import { evaluateGeofencePositions } from '../../lib/services/geofence-service';
import {
  loadGeofenceAlertRules,
  createGeofenceAlert,
  createAlertNotification,
  updateDeviceStatus,
  AlertRule,
} from '../../lib/services/alert-service';

interface DeviceInfo {
  id: bigint;
  uuid: string;
  name: string;
  userId: bigint;
  userEmail: string;
}

// State maps (reset on worker restart)
const geofenceStateMap = new Map<string, boolean | null>();
const entryTimeMap     = new Map<string, Date>();
const lastAlertTimeMap = new Map<string, Date>();
const rulesCache       = new Map<string, AlertRule[]>();

const subjectMap: Record<string, string> = {
  boundary_entry: 'Entrada a geocerca',
  boundary_exit:  'Salida de geocerca',
  dwell_time:     'Permanencia en geocerca',
};

// ---------------------------------------------------------------------------
// Startup diagnostics
// ---------------------------------------------------------------------------

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
    console.warn('     → Correr db:seed sección [3] Assets y [4] Dispositivos para vincularlos.');
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
    console.warn('     → Correr db:seed sección [6] Geocercas.');
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
    console.warn('     → Correr db:seed sección [8] Geofence alert rules.');
  } else {
    console.log(`  ✅ ${rulesCount.n} regla(s) de alerta activa(s)`);
  }

  console.log('');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

  // Determine notification recipients: rule.notifyUsers if set, fallback to device owner
  const subject = `[ALERT] ${device.name} — ${subjectMap[conditionType] ?? conditionType}`;
  const channels = rule.notificationChannels.length > 0 ? rule.notificationChannels : ['in_app'];
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

// ---------------------------------------------------------------------------
// GPS event handler
// ---------------------------------------------------------------------------

async function handleGpsEvent(
  payload: GpsPayload,
  deviceMap: Map<string, DeviceInfo>
): Promise<void> {
  const device = deviceMap.get(payload.deviceId);
  if (!device) {
    console.warn(`  ❓ Device desconocido: ${payload.deviceId}`);
    return;
  }

  const timestamp = new Date(payload.timestamp);

  // Insert telemetry event
  const event = await insertTelemetryEvent(device.id, payload.lat, payload.lng, payload.alt, timestamp);
  console.log(`📍 [${device.name}] Event #${event.id} at (${payload.lat.toFixed(5)}, ${payload.lng.toFixed(5)})`);

  // Evaluate geofences
  const evaluations = await evaluateGeofencePositions(device.id, payload.lat, payload.lng, timestamp);

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
      if (currInside) entryTimeMap.set(stateKey, timestamp);
      console.log(`  ↳ [baseline] '${ev.geofenceName}': ${currInside ? 'inside' : 'outside'}`);
      continue;
    }

    geofenceStateMap.set(stateKey, currInside);
    const rules = await getOrLoadRules(ev.geofenceId);

    // --- ENTRY ---
    if (!prevState && currInside) {
      entryTimeMap.set(stateKey, timestamp);
      if (ev.alertOnEntry) {
        const geoDetail = ev.geofenceTypeName === 'circular'
          ? `. Distance: ${ev.distanceMeters.toFixed(0)}m (radius: ${ev.radiusMeters}m)`
          : '';
        const message = `Device '${device.name}' entered geofence '${ev.geofenceName}'${geoDetail}`;
        console.log(`  ✅ ENTRY: '${device.name}' → '${ev.geofenceName}'`);
        await fireAlert('boundary_entry', device, ev.geofenceId, ev.geofenceName, event.id, payload.lat, payload.lng, timestamp, message, rules);
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
        await fireAlert('boundary_exit', device, ev.geofenceId, ev.geofenceName, event.id, payload.lat, payload.lng, timestamp, message, rules);
        await updateDeviceStatus(device.id, 'alert');
      }
    }

    // --- DWELL ---
    if (currInside && ev.alertOnDwell) {
      const entryTime = entryTimeMap.get(stateKey);
      if (entryTime) {
        const dwellRule = rules.find((r) => r.conditionType === 'dwell_time' && r.active);
        if (dwellRule) {
          const dwellMs   = timestamp.getTime() - entryTime.getTime();
          const threshold = dwellThresholdMs(dwellRule);
          if (dwellMs >= threshold) {
            const dwellMin = Math.floor(dwellMs / 60_000);
            const message  = `Device '${device.name}' has been inside geofence '${ev.geofenceName}' for ${dwellMin}m.`;
            console.log(`  ⏱️ DWELL: '${device.name}' lleva ${dwellMin}m dentro de '${ev.geofenceName}'`);
            await fireAlert('dwell_time', device, ev.geofenceId, ev.geofenceName, event.id, payload.lat, payload.lng, timestamp, message, rules);
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('🚀 Starting MQTT worker...');

  const devices = await db
    .select({
      id:        devicesTable.id,
      uuid:      devicesTable.serialNumber,
      name:      devicesTable.name,
      userId:    devicesTable.userId,
      userEmail: usersTable.email,
    })
    .from(devicesTable)
    .innerJoin(usersTable, eq(devicesTable.userId, usersTable.id))
    .where(eq(devicesTable.active, true));

  if (devices.length === 0) {
    throw new Error('No active devices found. Run db:seed first.');
  }

  console.log(`📟 Loaded ${devices.length} active device(s): ${devices.map((d) => d.name).join(', ')}`);

  await diagnoseSetup(devices);

  const deviceMap = new Map<string, DeviceInfo>(devices.map((d) => [d.uuid, d]));

  const bus = createMqttBus();

  subscribe(bus, async (_topic, payload) => {
    try {
      await handleGpsEvent(payload, deviceMap);
    } catch (e) {
      console.error('Error handling GPS event:', e);
    }
  });

  const stop = startSimulator(bus, devices.map((d) => d.uuid), 5000);
  console.log(`📡 Simulator started — publishing every 5s for ${devices.length} device(s)`);
  console.log('Press Ctrl+C to stop.\n');

  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
