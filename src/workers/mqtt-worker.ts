import 'dotenv/config';
import { db } from '../db';
import { devicesTable, usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createMqttBus, subscribe, startSimulator, GpsPayload } from './mock-mqtt';
import { insertTrackingEvent } from '../../lib/services/tracking-service';
import { evaluateGeofencePositions } from '../../lib/services/geofence-service';
import {
  resolveAlertTypeId,
  loadGeofenceAlertRules,
  createGeofenceAlert,
  createAlertNotification,
  updateDeviceStatus,
  AlertRule,
} from '../../lib/services/alert-service';

const DWELL_THRESHOLD_MS = parseInt(process.env.DWELL_THRESHOLD_MS ?? '60000');

interface DeviceInfo {
  id: bigint;
  uuid: string;
  name: string;
  userId: bigint;
  userEmail: string;
}

interface AlertTypeIds {
  geofence_exit: number;
  geofence_entry: number;
  geofence_dwell: number;
}

// State maps (reset on worker restart)
const geofenceStateMap = new Map<string, boolean | null>();
const entryTimeMap = new Map<string, Date>();
const lastAlertTimeMap = new Map<string, Date>();
const rulesCache = new Map<string, AlertRule[]>();

const subjectMap: Record<string, string> = {
  geofence_exit: 'Salida de geocerca',
  geofence_entry: 'Entrada a geocerca',
  geofence_dwell: 'Permanencia en geocerca',
};

const conditionTypeForAlert: Record<string, string> = {
  geofence_exit: 'boundary_exit',
  geofence_entry: 'boundary_entry',
  geofence_dwell: 'dwell_time',
};

async function getOrLoadRules(geofenceId: bigint): Promise<AlertRule[]> {
  const key = geofenceId.toString();
  if (!rulesCache.has(key)) {
    const rules = await loadGeofenceAlertRules(geofenceId);
    rulesCache.set(key, rules);
  }
  return rulesCache.get(key)!;
}

async function fireAlert(
  alertTypeName: keyof AlertTypeIds,
  alertTypeIds: AlertTypeIds,
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
  const conditionType = conditionTypeForAlert[alertTypeName];
  const rule = rules.find((r) => r.conditionType === conditionType);
  if (!rule) return;

  const cooldownKey = `${device.id}:${geofenceId}:${alertTypeName}`;
  const lastAlert = lastAlertTimeMap.get(cooldownKey);
  if (lastAlert && (timestamp.getTime() - lastAlert.getTime()) < rule.cooldownPeriod * 1000) {
    return; // still within cooldown
  }

  const alert = await createGeofenceAlert({
    alertTypeId: alertTypeIds[alertTypeName],
    deviceId: device.id,
    geofenceId,
    trackingEventId,
    lat,
    lng,
    alertTimestamp: timestamp,
    message,
    severity: rule.priority,
  });

  const subject = `[ALERT] ${device.name} — ${subjectMap[alertTypeName]}`;

  for (const channel of rule.notificationChannels) {
    for (let i = 0; i < rule.notifyUsers.length; i++) {
      await createAlertNotification({
        alertId: alert.id,
        alertTimestamp: alert.alertTimestamp,
        userId: device.userId,
        userEmail: device.userEmail,
        deviceName: device.name,
        message,
        notificationMethod: channel,
        subject,
      });
    }
  }

  lastAlertTimeMap.set(cooldownKey, timestamp);
  console.log(`  🔔 Notification (${rule.notificationChannels.join(',')}) → ${device.userEmail}`);
}

async function handleGpsEvent(
  payload: GpsPayload,
  deviceMap: Map<string, DeviceInfo>,
  alertTypeIds: AlertTypeIds
): Promise<void> {
  const device = deviceMap.get(payload.deviceId);
  if (!device) {
    console.warn(`Unknown device UUID: ${payload.deviceId}`);
    return;
  }

  const timestamp = new Date(payload.timestamp);

  // Insert tracking event
  const event = await insertTrackingEvent(
    device.id,
    payload.lat,
    payload.lng,
    payload.alt,
    timestamp
  );
  console.log(
    `📍 [${device.name}] Event #${event.id} at (${payload.lat.toFixed(5)}, ${payload.lng.toFixed(5)})`
  );

  // Evaluate all geofence positions
  const evaluations = await evaluateGeofencePositions(
    device.id,
    payload.lat,
    payload.lng,
    timestamp
  );

  for (const ev of evaluations) {
    const stateKey = `${device.id}:${ev.geofenceId}`;
    const prevState = geofenceStateMap.get(stateKey) ?? null;
    const currInside = ev.isInside;

    // First tick: establish baseline, no alert
    if (prevState === null) {
      geofenceStateMap.set(stateKey, currInside);
      if (currInside) entryTimeMap.set(stateKey, timestamp);
      console.log(`  [baseline] ${device.name} / '${ev.geofenceName}': ${currInside ? 'inside' : 'outside'}`);
      continue;
    }

    geofenceStateMap.set(stateKey, currInside);

    const rules = await getOrLoadRules(ev.geofenceId);

    // Entry transition: was outside, now inside
    if (!prevState && currInside) {
      entryTimeMap.set(stateKey, timestamp);
      if (ev.alertOnEntry) {
        const message =
          `Device '${device.name}' entered geofence '${ev.geofenceName}'. ` +
          `Distance: ${ev.distanceMeters.toFixed(0)}m (radius: ${ev.radiusMeters}m)`;
        console.log(`  ✅ ENTRY: Device '${device.name}' entró a '${ev.geofenceName}' (dist: ${ev.distanceMeters.toFixed(0)}m)`);
        await fireAlert('geofence_entry', alertTypeIds, device, ev.geofenceId, ev.geofenceName, event.id, payload.lat, payload.lng, timestamp, message, rules);
        await updateDeviceStatus(device.id, 'active');
      }
    }

    // Exit transition: was inside, now outside
    if (prevState && !currInside) {
      entryTimeMap.delete(stateKey);
      if (ev.alertOnExit) {
        const message =
          `Device '${device.name}' exited geofence '${ev.geofenceName}'. ` +
          `Distance: ${ev.distanceMeters.toFixed(0)}m (radius: ${ev.radiusMeters}m)`;
        console.log(`  🚨 EXIT: Device '${device.name}' salió de '${ev.geofenceName}' (dist: ${ev.distanceMeters.toFixed(0)}m, radio: ${ev.radiusMeters}m)`);
        await fireAlert('geofence_exit', alertTypeIds, device, ev.geofenceId, ev.geofenceName, event.id, payload.lat, payload.lng, timestamp, message, rules);
        await updateDeviceStatus(device.id, 'alert');
      }
    }

    // Dwell check: currently inside
    if (currInside && ev.alertOnDwell) {
      const entryTime = entryTimeMap.get(stateKey);
      if (entryTime) {
        const dwellMs = timestamp.getTime() - entryTime.getTime();
        const thresholdMs = DWELL_THRESHOLD_MS > 0 ? DWELL_THRESHOLD_MS : (ev.dwellTimeThreshold ?? 1_800_000);
        if (dwellMs >= thresholdMs) {
          const dwellMin = Math.floor(dwellMs / 60_000);
          const message =
            `Device '${device.name}' has been inside geofence '${ev.geofenceName}' for ${dwellMin}m.`;
          console.log(`  ⏱️ DWELL: Device '${device.name}' lleva ${dwellMin}m dentro de '${ev.geofenceName}'`);
          await fireAlert('geofence_dwell', alertTypeIds, device, ev.geofenceId, ev.geofenceName, event.id, payload.lat, payload.lng, timestamp, message, rules);
        }
      }
    }
  }
}

async function main(): Promise<void> {
  console.log('🚀 Starting MQTT worker...');

  // 1. Resolve all alert type IDs (fail-fast if not seeded)
  const alertTypeIds: AlertTypeIds = {
    geofence_exit: await resolveAlertTypeId('geofence_exit'),
    geofence_entry: await resolveAlertTypeId('geofence_entry'),
    geofence_dwell: await resolveAlertTypeId('geofence_dwell'),
  };
  console.log(`✅ Alert types resolved — exit: ${alertTypeIds.geofence_exit}, entry: ${alertTypeIds.geofence_entry}, dwell: ${alertTypeIds.geofence_dwell}`);
  console.log(`⏱️ Dwell threshold: ${DWELL_THRESHOLD_MS}ms (${Math.round(DWELL_THRESHOLD_MS / 60000)}min) — override via DWELL_THRESHOLD_MS env`);

  // 2. Load active devices with owner info
  const devices = await db
    .select({
      id: devicesTable.id,
      uuid: devicesTable.uuid,
      name: devicesTable.name,
      userId: devicesTable.userId,
      userEmail: usersTable.email,
    })
    .from(devicesTable)
    .innerJoin(usersTable, eq(devicesTable.userId, usersTable.id))
    .where(eq(devicesTable.active, true));

  if (devices.length === 0) {
    throw new Error('No active devices found. Run db:seed first.');
  }

  const deviceMap = new Map<string, DeviceInfo>(
    devices.map((d) => [d.uuid, d])
  );
  console.log(`📟 Loaded ${devices.length} active device(s): ${devices.map((d) => d.name).join(', ')}`);

  // 3. Start mock MQTT bus + simulator (5s interval)
  const bus = createMqttBus();

  subscribe(bus, async (topic, payload) => {
    try {
      await handleGpsEvent(payload, deviceMap, alertTypeIds);
    } catch (e) {
      console.error('Error handling GPS event:', e);
    }
  });

  const stop = startSimulator(bus, devices.map((d) => d.uuid), 5000);
  console.log(`📡 Simulator started — publishing every 5s for ${devices.length} device(s)`);
  console.log('Press Ctrl+C to stop.\n');

  // 4. Graceful shutdown
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
