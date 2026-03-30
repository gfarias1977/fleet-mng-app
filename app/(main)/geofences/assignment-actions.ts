'use server';

import { z } from 'zod';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getOrCreateUserByEmail } from '@/data/users';
import {
  getAssignmentsPaginated,
  getAvailableAssetsForGeofence,
  createAssignment,
  deleteAssignment,
  type AssignmentRow,
  type AssignmentSortField,
} from '@/data/asset-geofence-assignments';
import type { PaginatedResult } from '@/data/geofences';

// ---------------------------------------------------------------------------
// Shared result type
// ---------------------------------------------------------------------------

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const getAssignmentsSchema = z.object({
  geofenceId: z.string().regex(/^\d+$/, 'geofenceId must be numeric'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  sortField: z
    .enum([
      'assetNumber',
      'assetTypeName',
      'assetStatus',
      'isActive',
      'priority',
      'validFrom',
      'validUntil',
      'createdAt',
    ])
    .optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

const getAvailableAssetsSchema = z.object({
  geofenceId: z.string().regex(/^\d+$/, 'geofenceId must be numeric'),
});

const createAssignmentSchema = z.object({
  geofenceId: z.string().regex(/^\d+$/),
  assetId: z.string().regex(/^\d+$/),
  isActive: z.boolean().default(true),
  priority: z.coerce.number().int().min(0).max(100).default(0),
  alertOnEntry: z.boolean().default(true),
  alertOnExit: z.boolean().default(true),
  alertOnDwell: z.boolean().default(false),
  dwellTimeThreshold: z.coerce.number().int().min(0).nullish(),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date().nullish(),
});

const deleteAssignmentSchema = z.object({
  id: z.string().regex(/^\d+$/),
});

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function resolveUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const clerkUser = await currentUser();
  const primaryEmail = clerkUser?.emailAddresses[0]?.emailAddress;
  if (!primaryEmail) return null;

  const fullName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') || primaryEmail;
  return getOrCreateUserByEmail({ email: primaryEmail, name: fullName });
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function getAssignmentsAction(
  input: z.input<typeof getAssignmentsSchema>
): Promise<ActionResult<PaginatedResult<AssignmentRow>>> {
  const parsed = getAssignmentsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  const { geofenceId, page, pageSize, search, sortField, sortDir } = parsed.data;

  const data = await getAssignmentsPaginated(geofenceId, user.id, {
    page,
    pageSize,
    search,
    sortField: sortField as AssignmentSortField | undefined,
    sortDir,
  });

  return { success: true, data };
}

export async function getAvailableAssetsAction(
  input: z.input<typeof getAvailableAssetsSchema>
): Promise<ActionResult<{ id: string; number: string; typeName: string }[]>> {
  const parsed = getAvailableAssetsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const data = await getAvailableAssetsForGeofence(parsed.data.geofenceId);
  return { success: true, data };
}

export async function createAssignmentAction(
  input: z.input<typeof createAssignmentSchema>
): Promise<ActionResult<AssignmentRow>> {
  const parsed = createAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  const row = await createAssignment({
    geofenceId: BigInt(parsed.data.geofenceId),
    assetId: BigInt(parsed.data.assetId),
    isActive: parsed.data.isActive,
    priority: parsed.data.priority,
    alertOnEntry: parsed.data.alertOnEntry,
    alertOnExit: parsed.data.alertOnExit,
    alertOnDwell: parsed.data.alertOnDwell,
    dwellTimeThreshold: parsed.data.dwellTimeThreshold ?? null,
    validFrom: parsed.data.validFrom,
    validUntil: parsed.data.validUntil ?? null,
  });

  return { success: true, data: row };
}

export async function deleteAssignmentAction(
  input: z.input<typeof deleteAssignmentSchema>
): Promise<ActionResult> {
  const parsed = deleteAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  await deleteAssignment(parsed.data.id, user.id);

  return { success: true, data: undefined };
}
