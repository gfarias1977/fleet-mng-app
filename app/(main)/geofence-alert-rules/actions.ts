'use server';

import { z } from 'zod';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getUserByEmail } from '@/data/users';
import {
  createGeofenceAlertRule,
  updateGeofenceAlertRule,
  deleteGeofenceAlertRule,
  getAlertRulesByGeofenceId,
  getAlertTypesForSelect,
  type GeofenceAlertRuleRow,
} from '@/data/geofence-alert-rules';

// ---------------------------------------------------------------------------
// Shared result type
// ---------------------------------------------------------------------------

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

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
// Schemas
// ---------------------------------------------------------------------------

const createGeofenceAlertRuleSchema = z.object({
  geofenceId: z.string().min(1, 'Geofence is required'),
  alertTypeId: z.coerce.number().int().positive('Alert type is required'),
  conditionType: z.string().max(50).optional().nullable(),
  thresholdValue: z.string().optional().nullable(),
  thresholdUnit: z.string().max(20).optional().nullable(),
  cooldownPeriod: z.coerce.number().int().optional().nullable(),
  minimumDuration: z.coerce.number().int().optional().nullable(),
  notificationChannels: z.array(z.string()).default(['email']),
  webhookUrl: z.string().url('Must be a valid URL').optional().nullable(),
  active: z.boolean().default(true),
  priority: z.coerce.number().int().min(1).max(10).default(1),
});

const updateGeofenceAlertRuleSchema = createGeofenceAlertRuleSchema.extend({
  id: z.string().min(1),
});

const deleteGeofenceAlertRuleSchema = z.object({
  id: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function getAlertRulesForGeofenceAction(
  input: { geofenceId: string }
): Promise<ActionResult<GeofenceAlertRuleRow[]>> {
  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  try {
    const rules = await getAlertRulesByGeofenceId(user.id, BigInt(input.geofenceId));
    return { success: true, data: rules };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function getAlertTypesAction(): Promise<
  ActionResult<{ id: number; name: string; category: string | null }[]>
> {
  try {
    const types = await getAlertTypesForSelect();
    return { success: true, data: types };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function createGeofenceAlertRuleAction(
  input: z.infer<typeof createGeofenceAlertRuleSchema>
): Promise<ActionResult<GeofenceAlertRuleRow>> {
  const parsed = createGeofenceAlertRuleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  try {
    const rule = await createGeofenceAlertRule({
      userId: user.id,
      geofenceId: BigInt(parsed.data.geofenceId),
      alertTypeId: parsed.data.alertTypeId,
      conditionType: parsed.data.conditionType,
      thresholdValue: parsed.data.thresholdValue,
      thresholdUnit: parsed.data.thresholdUnit,
      cooldownPeriod: parsed.data.cooldownPeriod,
      minimumDuration: parsed.data.minimumDuration,
      notificationChannels: parsed.data.notificationChannels,
      webhookUrl: parsed.data.webhookUrl,
      active: parsed.data.active,
      priority: parsed.data.priority,
    });
    return { success: true, data: rule };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function updateGeofenceAlertRuleAction(
  input: z.infer<typeof updateGeofenceAlertRuleSchema>
): Promise<ActionResult<GeofenceAlertRuleRow>> {
  const parsed = updateGeofenceAlertRuleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  try {
    const rule = await updateGeofenceAlertRule(BigInt(parsed.data.id), user.id, {
      conditionType: parsed.data.conditionType,
      thresholdValue: parsed.data.thresholdValue,
      thresholdUnit: parsed.data.thresholdUnit,
      cooldownPeriod: parsed.data.cooldownPeriod,
      minimumDuration: parsed.data.minimumDuration,
      notificationChannels: parsed.data.notificationChannels,
      webhookUrl: parsed.data.webhookUrl,
      active: parsed.data.active,
      priority: parsed.data.priority,
    });
    return { success: true, data: rule };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function deleteGeofenceAlertRuleAction(
  input: z.infer<typeof deleteGeofenceAlertRuleSchema>
): Promise<ActionResult> {
  const parsed = deleteGeofenceAlertRuleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  try {
    await deleteGeofenceAlertRule(BigInt(parsed.data.id), user.id);
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}
