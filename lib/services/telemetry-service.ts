import { db } from '@/src/db';
import { devicesTable, telemetryEventsTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function findDeviceBySerialNumber(
  serialNumber: string
): Promise<{ id: bigint; name: string } | null> {
  const [device] = await db
    .select({ id: devicesTable.id, name: devicesTable.name })
    .from(devicesTable)
    .where(eq(devicesTable.serialNumber, serialNumber))
    .limit(1);

  return device ?? null;
}

export async function insertTelemetryEvent(
  deviceId: bigint,
  lat: number,
  lng: number,
  _alt: number,
  timestamp: Date
): Promise<{ id: bigint; eventTimestamp: Date }> {
  const [event] = await db
    .insert(telemetryEventsTable)
    .values({
      deviceId,
      eventTimestamp: timestamp,
      latitude:  lat.toString(),
      longitude: lng.toString(),
    })
    .returning();

  return { id: event.id, eventTimestamp: event.eventTimestamp };
}
