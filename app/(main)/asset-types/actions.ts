'use server';

import { z } from 'zod';
import { auth, currentUser } from '@clerk/nextjs/server';
import {
  createAssetType,
  updateAssetType,
  deleteAssetType,
  type AssetType,
} from '@/data/asset-types';

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

const assetTypeSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(100),
  status: z.enum(['active', 'inactive']).default('active'),
});

const updateAssetTypeSchema = assetTypeSchema.partial().extend({
  id: z.coerce.number().int().positive(),
  name: z.string().min(1, 'Nombre requerido').max(100),
});

const deleteAssetTypeSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createAssetTypeAction(
  input: z.infer<typeof assetTypeSchema>
): Promise<ActionResult<AssetType>> {
  const authenticated = await requireAuth();
  if (!authenticated) return { success: false, error: 'Unauthorized.' };

  const parsed = assetTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const record = await createAssetType({
      name: parsed.data.name,
      status: parsed.data.status,
    });
    return { success: true, data: record };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function updateAssetTypeAction(
  input: z.infer<typeof updateAssetTypeSchema>
): Promise<ActionResult<AssetType>> {
  const authenticated = await requireAuth();
  if (!authenticated) return { success: false, error: 'Unauthorized.' };

  const parsed = updateAssetTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const { id, ...rest } = parsed.data;
    const record = await updateAssetType(id, rest);
    return { success: true, data: record };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function deleteAssetTypeAction(
  input: z.infer<typeof deleteAssetTypeSchema>
): Promise<ActionResult> {
  const authenticated = await requireAuth();
  if (!authenticated) return { success: false, error: 'Unauthorized.' };

  const parsed = deleteAssetTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await deleteAssetType(parsed.data.id);
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}
