'use server';

import { z } from 'zod';
import { auth, currentUser } from '@clerk/nextjs/server';
import {
  createSensor,
  updateSensor,
  deleteSensor,
  type SensorRow,
} from '@/data/sensors';

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

const sensorSchema = z.object({
  stId: z.coerce.number().int().positive('Tipo de sensor requerido'),
  name: z.string().min(1, 'Nombre requerido').max(150),
  model: z.string().max(50).optional().nullable(),
  brand: z.string().max(50).optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
});

const updateSensorSchema = sensorSchema.partial().extend({
  id: z.coerce.number().int().positive(),
  name: z.string().min(1, 'Nombre requerido').max(150),
  stId: z.coerce.number().int().positive('Tipo de sensor requerido'),
});

const deleteSensorSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createSensorAction(
  input: z.infer<typeof sensorSchema>
): Promise<ActionResult<SensorRow>> {
  const authenticated = await requireAuth();
  if (!authenticated) return { success: false, error: 'Unauthorized.' };

  const parsed = sensorSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const record = await createSensor({
      stId: parsed.data.stId,
      name: parsed.data.name,
      model: parsed.data.model ?? null,
      brand: parsed.data.brand ?? null,
      status: parsed.data.status,
    });
    return { success: true, data: record };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function updateSensorAction(
  input: z.infer<typeof updateSensorSchema>
): Promise<ActionResult<SensorRow>> {
  const authenticated = await requireAuth();
  if (!authenticated) return { success: false, error: 'Unauthorized.' };

  const parsed = updateSensorSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const { id, ...rest } = parsed.data;
    const record = await updateSensor(id, rest);
    return { success: true, data: record };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function deleteSensorAction(
  input: z.infer<typeof deleteSensorSchema>
): Promise<ActionResult> {
  const authenticated = await requireAuth();
  if (!authenticated) return { success: false, error: 'Unauthorized.' };

  const parsed = deleteSensorSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await deleteSensor(parsed.data.id);
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}
