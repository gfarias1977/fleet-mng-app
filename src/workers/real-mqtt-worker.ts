import 'dotenv/config';
import * as mqtt from 'mqtt';
import { db } from '../db';
import { devicesTable, usersTable, deviceSensorsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { insertTelemetryEvent } from '../../lib/services/telemetry-service';

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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🚀 Starting real MQTT worker...');

  const sensorDeviceMap = await buildSensorDeviceMap();
  console.log(`📟 Loaded ${sensorDeviceMap.size} sensor→device mapping(s)`);

  if (sensorDeviceMap.size === 0) {
    console.warn('⚠️  No se encontraron sensores vinculados a dispositivos activos.');
    console.warn('   → Verifica que existan registros en device_sensors y devices.active = true');
  }

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

    const { latitude, longitude, altitude, sensor_id } = payload;

    const device = sensorDeviceMap.get(sensor_id);
    if (!device) {
      console.warn(`❓ sensor_id ${sensor_id} no está vinculado a ningún dispositivo activo`);
      return;
    }

    try {
      const now   = new Date();
      const event = await insertTelemetryEvent(device.id, latitude, longitude, altitude, now);
      console.log(
        `📍 [${device.name}] Event #${event.id} ` +
        `lat=${latitude} lng=${longitude} alt=${altitude} hdop=${payload.hdop}`
      );
    } catch (err) {
      console.error(`❌ Error guardando telemetría para device '${device.name}':`, err);
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
