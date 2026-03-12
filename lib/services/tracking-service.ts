import { db } from '@/src/db';
import { devicesTable, trackingEventsTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function findDeviceByUuid(
  uuid: string
): Promise<{ id: bigint; name: string } | null> {
  const [device] = await db
    .select({ id: devicesTable.id, name: devicesTable.name })
    .from(devicesTable)
    .where(eq(devicesTable.uuid, uuid))
    .limit(1);

  return device ?? null;
}

export async function insertTrackingEvent(
  deviceId: bigint,
  lat: number,
  lng: number,
  alt: number,
  timestamp: Date
): Promise<{ id: bigint; eventTimestamp: Date }> {
  const [event] = await db
    .insert(trackingEventsTable)
    .values({
      deviceId,
      eventTimestamp: timestamp,
      latitude: lat.toString(),
      longitude: lng.toString(),
      altitude: alt.toString(),
    })
    .returning();

  return { id: event.id, eventTimestamp: event.eventTimestamp };
}
