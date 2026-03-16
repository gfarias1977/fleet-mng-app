'use server';

import { z } from 'zod';
import { auth, currentUser } from '@clerk/nextjs/server';
import {
  createSensorType,
  updateSensorType,
  deleteSensorType,
  type SensorType,
} from '@/data/sensor-types';

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

const sensorTypeSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(50),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

const updateSensorTypeSchema = sensorTypeSchema.partial().extend({
  id: z.coerce.number().int().positive(),
  name: z.string().min(1, 'Nombre requerido').max(50),
});

const deleteSensorTypeSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createSensorTypeAction(
  input: z.infer<typeof sensorTypeSchema>
): Promise<ActionResult<SensorType>> {
  const authenticated = await requireAuth();
  if (!authenticated) return { success: false, error: 'Unauthorized.' };

  const parsed = sensorTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const record = await createSensorType({
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

export async function updateSensorTypeAction(
  input: z.infer<typeof updateSensorTypeSchema>
): Promise<ActionResult<SensorType>> {
  const authenticated = await requireAuth();
  if (!authenticated) return { success: false, error: 'Unauthorized.' };

  const parsed = updateSensorTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const { id, ...rest } = parsed.data;
    const record = await updateSensorType(id, rest);
    return { success: true, data: record };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function deleteSensorTypeAction(
  input: z.infer<typeof deleteSensorTypeSchema>
): Promise<ActionResult> {
  const authenticated = await requireAuth();
  if (!authenticated) return { success: false, error: 'Unauthorized.' };

  const parsed = deleteSensorTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await deleteSensorType(parsed.data.id);
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}
