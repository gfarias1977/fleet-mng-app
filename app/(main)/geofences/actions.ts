'use server';

import { z } from 'zod';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getUserByEmail } from '@/data/users';
import {
  createGeofence,
  updateGeofence,
  deleteGeofence,
  getGeofenceMapData,
  getGeofenceWithGeometry,
  type GeofenceRow,
  type GeofenceMapData,
  type GeofenceWithGeometry,
} from '@/data/geofences';
import {
  getAlertsByAssetAndGeofence,
  getNotificationsByAssetAndGeofence,
  type AlertRow,
  type NotificationRow,
} from '@/data/alerts';

// ---------------------------------------------------------------------------
// Shared result type
// ---------------------------------------------------------------------------

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Geometry schemas
// ---------------------------------------------------------------------------

const circularGeometrySchema = z.object({
  type: z.literal('circular'),
  centerLatitude: z.string().min(1),
  centerLongitude: z.string().min(1),
  radiusMeters: z.string().min(1),
});

const polygonGeometrySchema = z.object({
  type: z.literal('polygon'),
  points: z
    .array(
      z.object({
        latitude: z.string(),
        longitude: z.string(),
        pointOrder: z.number().int(),
      })
    )
    .min(3, 'Polygon requires at least 3 points'),
});

const rectangularGeometrySchema = z.object({
  type: z.literal('rectangular'),
  nwLatitude: z.string().min(1),
  nwLongitude: z.string().min(1),
  seLatitude: z.string().min(1),
  seLongitude: z.string().min(1),
});

const geometrySchema = z.discriminatedUnion('type', [
  circularGeometrySchema,
  polygonGeometrySchema,
  rectangularGeometrySchema,
]);

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const geofenceBaseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional().nullable(),
  geofenceTypeId: z.coerce.number().int().positive('Type is required'),
  active: z.boolean().default(true),
  geometry: geometrySchema,
});

const createGeofenceSchema = geofenceBaseSchema;
const updateGeofenceSchema = geofenceBaseSchema.partial().extend({
  id: z.string(),
  geometry: geometrySchema,
});
const deleteGeofenceSchema = z.object({ id: z.string() });
const mapDataSchema = z.object({ id: z.string() });
const geometryFetchSchema = z.object({ id: z.string() });
const assetGeofenceSchema = z.object({
  assetId: z.string().regex(/^\d+$/, 'assetId must be a numeric string'),
  geofenceId: z.string().regex(/^\d+$/, 'geofenceId must be a numeric string'),
});

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
    active: parsed.data.active,
    geometry: parsed.data.geometry,
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

export async function getGeofenceWithGeometryAction(
  input: z.infer<typeof geometryFetchSchema>
): Promise<ActionResult<GeofenceWithGeometry | null>> {
  const parsed = geometryFetchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  const data = await getGeofenceWithGeometry(BigInt(parsed.data.id), user.id);

  return { success: true, data };
}

export async function getAlertsForAssetAction(
  input: z.infer<typeof assetGeofenceSchema>
): Promise<ActionResult<AlertRow[]>> {
  const parsed = assetGeofenceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  const data = await getAlertsByAssetAndGeofence(
    Number(parsed.data.assetId),
    BigInt(parsed.data.geofenceId),
    user.id
  );

  return { success: true, data };
}

export async function getNotificationsForAssetAction(
  input: z.infer<typeof assetGeofenceSchema>
): Promise<ActionResult<NotificationRow[]>> {
  const parsed = assetGeofenceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  const data = await getNotificationsByAssetAndGeofence(
    Number(parsed.data.assetId),
    BigInt(parsed.data.geofenceId),
    user.id
  );

  return { success: true, data };
}
