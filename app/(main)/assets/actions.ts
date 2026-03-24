'use server';

import { z } from 'zod';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getUserByEmail } from '@/data/users';
import {
  createAsset,
  updateAsset,
  deleteAsset,
  getDevicesForAsset,
  getAvailableDevicesForUser,
  assignDeviceToAsset,
  unassignDeviceFromAsset,
  type AssetRow,
  type AssignedDevice,
} from '@/data/assets';

// ---------------------------------------------------------------------------
// Shared result type
// ---------------------------------------------------------------------------

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

async function requireAuth(): Promise<boolean> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return false;
  const clerkUser = await currentUser();
  return !!clerkUser;
}

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

const createAssetSchema = z.object({
  assetTypeId: z.coerce.number().int().positive('Tipo de activo requerido'),
  number: z.string().min(1, 'Número requerido').max(150),
  status: z.enum(['active', 'inactive']).default('active'),
});

const updateAssetSchema = createAssetSchema.extend({
  id: z.coerce.number().int().positive(),
});

const deleteAssetSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const deviceAssignSchema = z.object({
  deviceId: z.string().min(1),
  assetId: z.coerce.number().int().positive(),
});

const deviceUnassignSchema = z.object({
  deviceId: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Actions — CRUD
// ---------------------------------------------------------------------------

export async function createAssetAction(
  input: z.infer<typeof createAssetSchema>
): Promise<ActionResult<AssetRow>> {
  const authenticated = await requireAuth();
  if (!authenticated) return { success: false, error: 'Unauthorized.' };

  const parsed = createAssetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const record = await createAsset({
      assetTypeId: parsed.data.assetTypeId,
      number: parsed.data.number,
      status: parsed.data.status,
    });
    return { success: true, data: record };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function updateAssetAction(
  input: z.infer<typeof updateAssetSchema>
): Promise<ActionResult<AssetRow>> {
  const authenticated = await requireAuth();
  if (!authenticated) return { success: false, error: 'Unauthorized.' };

  const parsed = updateAssetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const { id, ...rest } = parsed.data;
    const record = await updateAsset(id, rest);
    return { success: true, data: record };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function deleteAssetAction(
  input: z.infer<typeof deleteAssetSchema>
): Promise<ActionResult> {
  const authenticated = await requireAuth();
  if (!authenticated) return { success: false, error: 'Unauthorized.' };

  const parsed = deleteAssetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await deleteAsset(parsed.data.id);
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Actions — Device assignment
// ---------------------------------------------------------------------------

export async function getDevicesForAssetAction(
  assetId: string
): Promise<ActionResult<AssignedDevice[]>> {
  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  try {
    const devices = await getDevicesForAsset(Number(assetId), user.id);
    return { success: true, data: devices };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function getAvailableDevicesAction(): Promise<ActionResult<AssignedDevice[]>> {
  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  try {
    const devices = await getAvailableDevicesForUser(user.id);
    return { success: true, data: devices };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function assignDeviceAction(
  input: z.infer<typeof deviceAssignSchema>
): Promise<ActionResult> {
  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  const parsed = deviceAssignSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await assignDeviceToAsset(BigInt(parsed.data.deviceId), parsed.data.assetId, user.id);
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function unassignDeviceAction(
  input: z.infer<typeof deviceUnassignSchema>
): Promise<ActionResult> {
  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  const parsed = deviceUnassignSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await unassignDeviceFromAsset(BigInt(parsed.data.deviceId), user.id);
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}
