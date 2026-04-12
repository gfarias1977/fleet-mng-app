'use server';

import { z } from 'zod';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getUserByEmail } from '@/data/users';
import {
  createAlertNotification,
  updateAlertNotification,
  deleteAlertNotification,
} from '@/data/alert-notifications';

// ---------------------------------------------------------------------------
// Shared result type
// ---------------------------------------------------------------------------

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Auth helper
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

const NOTIFICATION_METHODS = ['email', 'sms', 'push', 'webhook'] as const;
const NOTIFICATION_STATUSES = ['pending', 'sent', 'delivered', 'failed'] as const;

const createNotificationSchema = z.object({
  alertId: z.string().min(1, 'Alerta requerida'),
  alertTimestamp: z.string().min(1, 'Timestamp de alerta requerido'),
  notificationMethod: z.string().max(20).optional().nullable(),
  destination: z.string().max(255).optional().nullable(),
  subject: z.string().max(255).optional().nullable(),
  body: z.string().optional().nullable(),
  status: z.string().default('pending'),
  retryCount: z.number().int().min(0).default(0),
  maxRetries: z.number().int().min(0).default(3),
});

const updateNotificationSchema = z.object({
  id: z.string().min(1),
  notificationMethod: z.string().max(20).optional().nullable(),
  destination: z.string().max(255).optional().nullable(),
  subject: z.string().max(255).optional().nullable(),
  body: z.string().optional().nullable(),
  status: z.string().min(1),
  retryCount: z.number().int().min(0),
  maxRetries: z.number().int().min(0),
});

const deleteNotificationSchema = z.object({
  id: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createAlertNotificationAction(
  input: z.infer<typeof createNotificationSchema>
): Promise<ActionResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: 'No autorizado.' };

  const parsed = createNotificationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await createAlertNotification(userId, {
      alertId: BigInt(parsed.data.alertId),
      alertTimestamp: new Date(parsed.data.alertTimestamp),
      notificationMethod: parsed.data.notificationMethod ?? null,
      destination: parsed.data.destination ?? null,
      subject: parsed.data.subject ?? null,
      body: parsed.data.body ?? null,
      status: parsed.data.status,
      retryCount: parsed.data.retryCount,
      maxRetries: parsed.data.maxRetries,
    });
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado.';
    return { success: false, error: message };
  }
}

export async function updateAlertNotificationAction(
  input: z.infer<typeof updateNotificationSchema>
): Promise<ActionResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: 'No autorizado.' };

  const parsed = updateNotificationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await updateAlertNotification(BigInt(parsed.data.id), userId, {
      notificationMethod: parsed.data.notificationMethod ?? null,
      destination: parsed.data.destination ?? null,
      subject: parsed.data.subject ?? null,
      body: parsed.data.body ?? null,
      status: parsed.data.status,
      retryCount: parsed.data.retryCount,
      maxRetries: parsed.data.maxRetries,
    });
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado.';
    return { success: false, error: message };
  }
}

export async function deleteAlertNotificationAction(
  input: z.infer<typeof deleteNotificationSchema>
): Promise<ActionResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: 'No autorizado.' };

  const parsed = deleteNotificationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await deleteAlertNotification(BigInt(parsed.data.id), userId);
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado.';
    return { success: false, error: message };
  }
}
