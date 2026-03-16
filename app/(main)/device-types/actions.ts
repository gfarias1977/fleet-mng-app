'use server';

import { z } from 'zod';
import { auth, currentUser } from '@clerk/nextjs/server';
import {
  createDeviceType,
  updateDeviceType,
  deleteDeviceType,
  type DeviceType,
} from '@/data/device-types';

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

const deviceTypeSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(50),
  description: z.string().optional().nullable(),
  capabilities: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

const updateDeviceTypeSchema = deviceTypeSchema.partial().extend({
  id: z.coerce.number().int().positive(),
  name: z.string().min(1, 'Nombre requerido').max(50),
});

const deleteDeviceTypeSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createDeviceTypeAction(
  input: z.infer<typeof deviceTypeSchema>
): Promise<ActionResult<DeviceType>> {
  const authenticated = await requireAuth();
  if (!authenticated) return { success: false, error: 'Unauthorized.' };

  const parsed = deviceTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const record = await createDeviceType({
      name: parsed.data.name,
      description: parsed.data.description,
      capabilities: parsed.data.capabilities,
      isActive: parsed.data.isActive,
    });
    return { success: true, data: record };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function updateDeviceTypeAction(
  input: z.infer<typeof updateDeviceTypeSchema>
): Promise<ActionResult<DeviceType>> {
  const authenticated = await requireAuth();
  if (!authenticated) return { success: false, error: 'Unauthorized.' };

  const parsed = updateDeviceTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const { id, ...rest } = parsed.data;
    const record = await updateDeviceType(id, rest);
    return { success: true, data: record };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function deleteDeviceTypeAction(
  input: z.infer<typeof deleteDeviceTypeSchema>
): Promise<ActionResult> {
  const authenticated = await requireAuth();
  if (!authenticated) return { success: false, error: 'Unauthorized.' };

  const parsed = deleteDeviceTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await deleteDeviceType(parsed.data.id);
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}
