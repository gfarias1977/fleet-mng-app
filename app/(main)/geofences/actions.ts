'use server';

import { z } from 'zod';
import { auth, currentUser } from '@clerk/nextjs/server'; // auth used in resolveUser
import { getUserByEmail } from '@/data/users';
import {
  createGeofence,
  updateGeofence,
  deleteGeofence,
  getGeofenceMapData,
  type GeofenceRow,
  type GeofenceMapData,
} from '@/data/geofences';

// ---------------------------------------------------------------------------
// Shared result type
// ---------------------------------------------------------------------------

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const geofenceBaseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional().nullable(),
  geofenceTypeId: z.coerce.number().int().positive('Type is required'),
  centerLatitude: z.string().optional().nullable(),
  centerLongitude: z.string().optional().nullable(),
  radiusMeters: z.string().optional().nullable(),
  active: z.boolean().default(true),
});

const createGeofenceSchema = geofenceBaseSchema;
const updateGeofenceSchema = geofenceBaseSchema.partial().extend({
  id: z.string(),
});
const deleteGeofenceSchema = z.object({ id: z.string() });
const mapDataSchema = z.object({ id: z.string() });

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function resolveUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const clerkUser = await currentUser();
  const primaryEmail = clerkUser?.emailAddresses[0]?.emailAddress;
  if (!primaryEmail) return null;

  return getUserByEmail(primaryEmail);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createGeofenceAction(
  input: z.infer<typeof createGeofenceSchema>
): Promise<ActionResult<GeofenceRow>> {
  const parsed = createGeofenceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  const geofence = await createGeofence({
    userId: user.id,
    name: parsed.data.name,
    description: parsed.data.description,
    geofenceTypeId: parsed.data.geofenceTypeId,
    centerLatitude: parsed.data.centerLatitude,
    centerLongitude: parsed.data.centerLongitude,
    radiusMeters: parsed.data.radiusMeters,
    active: parsed.data.active,
  });

  return { success: true, data: geofence };
}

export async function updateGeofenceAction(
  input: z.infer<typeof updateGeofenceSchema>
): Promise<ActionResult<GeofenceRow>> {
  const parsed = updateGeofenceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  const { id: idStr, ...rest } = parsed.data;
  const geofence = await updateGeofence(BigInt(idStr!), user.id, rest);

  return { success: true, data: geofence };
}

export async function deleteGeofenceAction(
  input: z.infer<typeof deleteGeofenceSchema>
): Promise<ActionResult> {
  const parsed = deleteGeofenceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  await deleteGeofence(BigInt(parsed.data.id), user.id);

  return { success: true, data: undefined };
}

export async function getGeofenceMapDataAction(
  input: z.infer<typeof mapDataSchema>
): Promise<ActionResult<GeofenceMapData | null>> {
  const parsed = mapDataSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  const data = await getGeofenceMapData(BigInt(parsed.data.id), user.id);

  return { success: true, data };
}
