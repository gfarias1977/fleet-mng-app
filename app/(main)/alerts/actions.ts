'use server';

import { z } from 'zod';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getUserByEmail } from '@/data/users';
import {
  createAlert,
  updateAlert,
  deleteAlert,
} from '@/data/alerts';

// ---------------------------------------------------------------------------
// Shared result type
// ---------------------------------------------------------------------------

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Auth helper — returns internal userId
// ---------------------------------------------------------------------------

async function getAuthenticatedUserId(): Promise<bigint | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;
  const clerkUser = await currentUser();
  const primaryEmail = clerkUser?.emailAddresses[0]?.emailAddress;
  if (!primaryEmail) return null;
  const user = await getUserByEmail(primaryEmail);
  return user?.id ?? null;
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createAlertSchema = z.object({
  alertTypeId: z.coerce.number().int().positive('Tipo de alerta requerido'),
  deviceId: z.string().min(1, 'Dispositivo requerido'),
  geofenceId: z.string().optional().nullable(),
  alertTimestamp: z.string().min(1, 'Fecha/hora requerida'),
  latitude: z.string().optional().nullable(),
  longitude: z.string().optional().nullable(),
  message: z.string().optional().nullable(),
  severity: z.number().int().min(1).max(5).default(1),
  status: z.string().default('active'),
});

const updateAlertSchema = z.object({
  id: z.string().min(1),
  alertTimestamp: z.string().min(1),
  message: z.string().optional().nullable(),
  severity: z.number().int().min(1).max(5),
  status: z.string().min(1),
});

const deleteAlertSchema = z.object({
  id: z.string().min(1),
  alertTimestamp: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createAlertAction(
  input: z.infer<typeof createAlertSchema>
): Promise<ActionResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: 'No autorizado.' };

  const parsed = createAlertSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await createAlert(userId, {
      alertTypeId: parsed.data.alertTypeId,
      deviceId: BigInt(parsed.data.deviceId),
      geofenceId: parsed.data.geofenceId ? BigInt(parsed.data.geofenceId) : null,
      alertTimestamp: new Date(parsed.data.alertTimestamp),
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
      message: parsed.data.message ?? null,
      severity: parsed.data.severity,
      status: parsed.data.status,
    });
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado.';
    return { success: false, error: message };
  }
}

export async function updateAlertAction(
  input: z.infer<typeof updateAlertSchema>
): Promise<ActionResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: 'No autorizado.' };

  const parsed = updateAlertSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await updateAlert(
      BigInt(parsed.data.id),
      new Date(parsed.data.alertTimestamp),
      userId,
      {
        message: parsed.data.message ?? null,
        severity: parsed.data.severity,
        status: parsed.data.status,
      }
    );
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado.';
    return { success: false, error: message };
  }
}

export async function deleteAlertAction(
  input: z.infer<typeof deleteAlertSchema>
): Promise<ActionResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: 'No autorizado.' };

  const parsed = deleteAlertSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await deleteAlert(
      BigInt(parsed.data.id),
      new Date(parsed.data.alertTimestamp),
      userId
    );
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado.';
    return { success: false, error: message };
  }
}
