import { db } from '@/src/db';
import {
  assetGeofenceAssignmentsTable,
  assetTable,
  assetTypesTable,
  geofencesTable,
} from '@/src/db/schema';
import {
  count,
  ilike,
  or,
  asc,
  desc,
  and,
  eq,
  notInArray,
  sql,
} from 'drizzle-orm';
import type { PaginatedResult } from './geofences';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AssignmentRow = {
  id: string;
  uuid: string;
  assetId: string;
  isActive: boolean | null;
  priority: number | null;
  alertOnEntry: boolean | null;
  alertOnExit: boolean | null;
  alertOnDwell: boolean | null;
  dwellTimeThreshold: number | null;
  validFrom: Date;
  validUntil: Date | null;
  createdAt: Date | null;
  assetNumber: string;
  assetTypeName: string;
  assetStatus: 'active' | 'inactive';
};

export type AssignmentSortField =
  | 'assetNumber'
  | 'assetTypeName'
  | 'assetStatus'
  | 'isActive'
  | 'priority'
  | 'validFrom'
  | 'validUntil'
  | 'createdAt';

export type CreateAssignmentInput = {
  geofenceId: bigint;
  assetId: bigint;
  isActive: boolean;
  priority: number;
  alertOnEntry: boolean;
  alertOnExit: boolean;
  alertOnDwell: boolean;
  dwellTimeThreshold?: number | null;
  validFrom: Date;
  validUntil?: Date | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSortColumn(field: AssignmentSortField) {
  switch (field) {
    case 'assetNumber':
      return assetTable.number;
    case 'assetTypeName':
      return assetTypesTable.name;
    case 'assetStatus':
      return assetTable.status;
    case 'isActive':
      return assetGeofenceAssignmentsTable.isActive;
    case 'priority':
      return assetGeofenceAssignmentsTable.priority;
    case 'validFrom':
      return assetGeofenceAssignmentsTable.validFrom;
    case 'validUntil':
      return assetGeofenceAssignmentsTable.validUntil;
    case 'createdAt':
      return assetGeofenceAssignmentsTable.createdAt;
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getAssignmentsPaginated(
  geofenceId: string,
  userId: bigint,
  opts: {
    page: number;
    pageSize: number;
    search?: string;
    sortField?: AssignmentSortField;
    sortDir?: 'asc' | 'desc';
  }
): Promise<PaginatedResult<AssignmentRow>> {
  const { page, pageSize, search, sortField = 'assetNumber', sortDir = 'asc' } = opts;
  const offset = (page - 1) * pageSize;

  const searchFilter = search
    ? or(
        ilike(assetTable.number, `%${search}%`),
        ilike(assetTypesTable.name, `%${search}%`)
      )
    : undefined;

  const where = and(
    eq(assetGeofenceAssignmentsTable.geofenceId, BigInt(geofenceId)),
    eq(geofencesTable.userId, userId),
    searchFilter
  );

  const sortColumn = getSortColumn(sortField);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = sortDir === 'desc' ? desc(sortColumn as any) : asc(sortColumn as any);

  const [{ total }] = await db
    .select({ total: count() })
    .from(assetGeofenceAssignmentsTable)
    .innerJoin(geofencesTable, eq(assetGeofenceAssignmentsTable.geofenceId, geofencesTable.id))
    .innerJoin(assetTable, eq(assetGeofenceAssignmentsTable.assetId, assetTable.id))
    .innerJoin(assetTypesTable, eq(assetTable.assetTypeId, assetTypesTable.id))
    .where(where);

  const rows = await db
    .select({
      id: assetGeofenceAssignmentsTable.id,
      uuid: assetGeofenceAssignmentsTable.uuid,
      assetId: assetGeofenceAssignmentsTable.assetId,
      isActive: assetGeofenceAssignmentsTable.isActive,
      priority: assetGeofenceAssignmentsTable.priority,
      alertOnEntry: assetGeofenceAssignmentsTable.alertOnEntry,
      alertOnExit: assetGeofenceAssignmentsTable.alertOnExit,
      alertOnDwell: assetGeofenceAssignmentsTable.alertOnDwell,
      dwellTimeThreshold: assetGeofenceAssignmentsTable.dwellTimeThreshold,
      validFrom: assetGeofenceAssignmentsTable.validFrom,
      validUntil: assetGeofenceAssignmentsTable.validUntil,
      createdAt: assetGeofenceAssignmentsTable.createdAt,
      assetNumber: assetTable.number,
      assetTypeName: sql<string>`coalesce(${assetTypesTable.name}, '')`,
      assetStatus: assetTable.status,
    })
    .from(assetGeofenceAssignmentsTable)
    .innerJoin(geofencesTable, eq(assetGeofenceAssignmentsTable.geofenceId, geofencesTable.id))
    .innerJoin(assetTable, eq(assetGeofenceAssignmentsTable.assetId, assetTable.id))
    .innerJoin(assetTypesTable, eq(assetTable.assetTypeId, assetTypesTable.id))
    .where(where)
    .orderBy(order)
    .limit(pageSize)
    .offset(offset);

  const data: AssignmentRow[] = rows.map((r) => ({
    ...r,
    id: String(r.id),
    assetId: String(r.assetId),
    priority: r.priority !== null ? Number(r.priority) : null,
    assetStatus: r.assetStatus as 'active' | 'inactive',
  }));

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAvailableAssetsForGeofence(
  geofenceId: string
): Promise<{ id: string; number: string; typeName: string }[]> {
  const assigned = await db
    .select({ assetId: assetGeofenceAssignmentsTable.assetId })
    .from(assetGeofenceAssignmentsTable)
    .where(eq(assetGeofenceAssignmentsTable.geofenceId, BigInt(geofenceId)));

  const assignedIntIds = assigned.map((a) => Number(a.assetId));

  const baseWhere = eq(assetTable.status, 'active');
  const where =
    assignedIntIds.length > 0
      ? and(baseWhere, notInArray(assetTable.id, assignedIntIds))
      : baseWhere;

  const rows = await db
    .select({
      id: assetTable.id,
      number: assetTable.number,
      typeName: sql<string>`coalesce(${assetTypesTable.name}, '')`,
    })
    .from(assetTable)
    .innerJoin(assetTypesTable, eq(assetTable.assetTypeId, assetTypesTable.id))
    .where(where);

  return rows.map((r) => ({ id: String(r.id), number: r.number, typeName: r.typeName }));
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createAssignment(input: CreateAssignmentInput): Promise<AssignmentRow> {
  const [row] = await db
    .insert(assetGeofenceAssignmentsTable)
    .values({
      geofenceId: input.geofenceId,
      assetId: input.assetId,
      isActive: input.isActive,
      priority: input.priority,
      alertOnEntry: input.alertOnEntry,
      alertOnExit: input.alertOnExit,
      alertOnDwell: input.alertOnDwell,
      dwellTimeThreshold: input.dwellTimeThreshold ?? null,
      validFrom: input.validFrom,
      validUntil: input.validUntil ?? null,
    })
    .returning();

  const [assetRow] = await db
    .select({
      number: assetTable.number,
      typeName: sql<string>`coalesce(${assetTypesTable.name}, '')`,
      status: assetTable.status,
    })
    .from(assetTable)
    .innerJoin(assetTypesTable, eq(assetTable.assetTypeId, assetTypesTable.id))
    .where(eq(assetTable.id, Number(row.assetId)))
    .limit(1);

  return {
    id: String(row.id),
    uuid: row.uuid,
    assetId: String(row.assetId),
    isActive: row.isActive,
    priority: row.priority !== null ? Number(row.priority) : null,
    alertOnEntry: row.alertOnEntry,
    alertOnExit: row.alertOnExit,
    alertOnDwell: row.alertOnDwell,
    dwellTimeThreshold: row.dwellTimeThreshold,
    validFrom: row.validFrom,
    validUntil: row.validUntil ?? null,
    createdAt: row.createdAt ?? null,
    assetNumber: assetRow?.number ?? '',
    assetTypeName: assetRow?.typeName ?? '',
    assetStatus: (assetRow?.status ?? 'active') as 'active' | 'inactive',
  };
}

export async function deleteAssignment(id: string, userId: bigint): Promise<void> {
  // Verify ownership: the assignment must belong to a geofence owned by this user
  const [assignment] = await db
    .select({ geofenceId: assetGeofenceAssignmentsTable.geofenceId })
    .from(assetGeofenceAssignmentsTable)
    .where(eq(assetGeofenceAssignmentsTable.id, BigInt(id)))
    .limit(1);

  if (!assignment) return;

  const [geofence] = await db
    .select({ id: geofencesTable.id })
    .from(geofencesTable)
    .where(
      and(
        eq(geofencesTable.id, assignment.geofenceId),
        eq(geofencesTable.userId, userId)
      )
    )
    .limit(1);

  if (!geofence) return;

  await db
    .delete(assetGeofenceAssignmentsTable)
    .where(eq(assetGeofenceAssignmentsTable.id, BigInt(id)));
}
