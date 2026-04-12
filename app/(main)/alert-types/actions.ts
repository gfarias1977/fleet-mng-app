'use server';

import { z } from 'zod';
import { auth, currentUser } from '@clerk/nextjs/server';
import {
  createAlertType,
  updateAlertType,
  deleteAlertType,
  type AlertType,
} from '@/data/alert-types';

// ---------------------------------------------------------------------------
// Shared result type
// ---------------------------------------------------------------------------

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Auth helper
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

const alertTypeSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(50),
  category: z.string().max(50).optional().nullable(),
  description: z.string().optional().nullable(),
  priority: z.coerce.number().int().min(1).max(10).default(1),
  requiresAcknowledgment: z.boolean().default(false),
  defaultMessage: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

const updateAlertTypeSchema = alertTypeSchema.partial().extend({
  id: z.coerce.number().int().positive(),
  name: z.string().min(1, 'Nombre requerido').max(50),
});

const deleteAlertTypeSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createAlertTypeAction(
  input: z.infer<typeof alertTypeSchema>
): Promise<ActionResult<AlertType>> {
  const authenticated = await requireAuth();
  if (!authenticated) return { success: false, error: 'No autorizado.' };

  const parsed = alertTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const record = await createAlertType(parsed.data);
    return { success: true, data: record };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado.';
    return { success: false, error: message };
  }
}

export async function updateAlertTypeAction(
  input: z.infer<typeof updateAlertTypeSchema>
): Promise<ActionResult<AlertType>> {
  const authenticated = await requireAuth();
  if (!authenticated) return { success: false, error: 'No autorizado.' };

  const parsed = updateAlertTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const { id, ...rest } = parsed.data;
    const record = await updateAlertType(id, rest);
    return { success: true, data: record };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado.';
    return { success: false, error: message };
  }
}

export async function deleteAlertTypeAction(
  input: z.infer<typeof deleteAlertTypeSchema>
): Promise<ActionResult> {
  const authenticated = await requireAuth();
  if (!authenticated) return { success: false, error: 'No autorizado.' };

  const parsed = deleteAlertTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await deleteAlertType(parsed.data.id);
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado.';
    return { success: false, error: message };
  }
}
