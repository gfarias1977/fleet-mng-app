'use server';

import { z } from 'zod';
import { auth, currentUser } from '@clerk/nextjs/server';
import {
  createGeofenceType,
  updateGeofenceType,
  deleteGeofenceType,
  type GeofenceType,
} from '@/data/geofence-types';

// ---------------------------------------------------------------------------
// Shared result type
// ---------------------------------------------------------------------------

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Auth helper — only verifies the user is signed in (no userId needed)
// ---------------------------------------------------------------------------

async function requireAuth(): Promise<boolean> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return false;
  const clerkUser = await currentUser();
  return !!clerkUser;
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const geofenceTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

const updateGeofenceTypeSchema = geofenceTypeSchema.partial().extend({
  id: z.coerce.number().int().positive(),
  name: z.string().min(1, 'Name is required').max(50),
});

const deleteGeofenceTypeSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createGeofenceTypeAction(
  input: z.infer<typeof geofenceTypeSchema>
): Promise<ActionResult<GeofenceType>> {
  const authenticated = await requireAuth();
  if (!authenticated) return { success: false, error: 'Unauthorized.' };

  const parsed = geofenceTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const record = await createGeofenceType({
      name: parsed.data.name,
      description: parsed.data.description,
      isActive: parsed.data.isActive,
    });
    return { success: true, data: record };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function updateGeofenceTypeAction(
  input: z.infer<typeof updateGeofenceTypeSchema>
): Promise<ActionResult<GeofenceType>> {
  const authenticated = await requireAuth();
  if (!authenticated) return { success: false, error: 'Unauthorized.' };

  const parsed = updateGeofenceTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const { id, ...rest } = parsed.data;
    const record = await updateGeofenceType(id, rest);
    return { success: true, data: record };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function deleteGeofenceTypeAction(
  input: z.infer<typeof deleteGeofenceTypeSchema>
): Promise<ActionResult> {
  const authenticated = await requireAuth();
  if (!authenticated) return { success: false, error: 'Unauthorized.' };

  const parsed = deleteGeofenceTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await deleteGeofenceType(parsed.data.id);
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}
