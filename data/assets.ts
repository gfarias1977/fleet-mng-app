import { db } from '@/src/db';
import { assetTable, assetTypesTable, devicesTable } from '@/src/db/schema';
import { count, ilike, or, asc, desc, eq, and, sql, isNull } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AssetRow = {
  id: number;
  uuid: string;
  number: string;
  status: 'active' | 'inactive';
  assetTypeId: number;
  assetTypeName: string;
  deviceCount: number;
};

export type AssetSortField = 'number' | 'assetTypeName' | 'status';

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CreateAssetInput = {
  assetTypeId: number;
  number: string;
  status?: 'active' | 'inactive';
};

export type UpdateAssetInput = {
  assetTypeId?: number;
  number?: string;
  status?: 'active' | 'inactive';
};

export type AssignedDevice = {
  id: bigint;
  serialNumber: string;
  name: string;
  status: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSortColumn(field: AssetSortField) {
  switch (field) {
    case 'number':
      return assetTable.number;
    case 'assetTypeName':
      return assetTypesTable.name;
    case 'status':
      return assetTable.status;
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getAssetsPaginated(opts: {
  page: number;
  pageSize: number;
  search?: string;
  sortField?: AssetSortField;
  sortDir?: 'asc' | 'desc';
}): Promise<PaginatedResult<AssetRow>> {
  const { page, pageSize, search, sortField = 'number', sortDir = 'asc' } = opts;
  const offset = (page - 1) * pageSize;

  const searchFilter = search
    ? or(
        ilike(assetTable.number, `%${search}%`),
        ilike(assetTypesTable.name, `%${search}%`)
      )
    : undefined;

  const sortColumn = getSortColumn(sortField);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = sortDir === 'desc' ? desc(sortColumn as any) : asc(sortColumn as any);

  const [{ total }] = await db
    .select({ total: count() })
    .from(assetTable)
    .innerJoin(assetTypesTable, eq(assetTable.assetTypeId, assetTypesTable.id))
    .where(searchFilter);

  const rows = await db
    .select({
      id: assetTable.id,
      uuid: assetTable.uuid,
      number: assetTable.number,
      status: assetTable.status,
      assetTypeId: assetTable.assetTypeId,
      assetTypeName: assetTypesTable.name,
      deviceCount: sql<number>`(SELECT COUNT(*) FROM devices WHERE dev_ass_id = ${assetTable.id})`,
    })
    .from(assetTable)
    .innerJoin(assetTypesTable, eq(assetTable.assetTypeId, assetTypesTable.id))
    .where(searchFilter)
    .orderBy(order)
    .limit(pageSize)
    .offset(offset);

  return {
    data: rows.map((r) => ({ ...r, deviceCount: Number(r.deviceCount) })) as AssetRow[],
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAssetById(id: number): Promise<AssetRow | null> {
  const [row] = await db
    .select({
      id: assetTable.id,
      uuid: assetTable.uuid,
      number: assetTable.number,
      status: assetTable.status,
      assetTypeId: assetTable.assetTypeId,
      assetTypeName: assetTypesTable.name,
      deviceCount: sql<number>`(SELECT COUNT(*) FROM devices WHERE dev_ass_id = ${assetTable.id})`,
    })
    .from(assetTable)
    .innerJoin(assetTypesTable, eq(assetTable.assetTypeId, assetTypesTable.id))
    .where(eq(assetTable.id, id))
    .limit(1);

  if (!row) return null;
  return { ...row, deviceCount: Number(row.deviceCount) } as AssetRow;
}

export async function getAssetTypesForSelect(): Promise<{ id: number; name: string }[]> {
  return db
    .select({ id: assetTypesTable.id, name: assetTypesTable.name })
    .from(assetTypesTable)
    .orderBy(asc(assetTypesTable.name));
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createAsset(input: CreateAssetInput): Promise<AssetRow> {
  const [row] = await db
    .insert(assetTable)
    .values({
      assetTypeId: input.assetTypeId,
      number: input.number,
      status: input.status ?? 'active',
    })
    .returning();

  const result = await getAssetById(row.id);
  if (!result) throw new Error('Failed to fetch created asset');
  return result;
}

export async function updateAsset(id: number, input: UpdateAssetInput): Promise<AssetRow> {
  await db
    .update(assetTable)
    .set({
      ...(input.assetTypeId !== undefined && { assetTypeId: input.assetTypeId }),
      ...(input.number !== undefined && { number: input.number }),
      ...(input.status !== undefined && { status: input.status }),
    })
    .where(eq(assetTable.id, id));

  const result = await getAssetById(id);
  if (!result) throw new Error('Failed to fetch updated asset');
  return result;
}

export async function deleteAsset(id: number): Promise<void> {
  await db.delete(assetTable).where(eq(assetTable.id, id));
}

// ---------------------------------------------------------------------------
// Device assignment helpers
// ---------------------------------------------------------------------------

export async function getDevicesForAsset(
  assetId: number,
  userId: bigint
): Promise<AssignedDevice[]> {
  const rows = await db
    .select({
      id: devicesTable.id,
      serialNumber: devicesTable.serialNumber,
      name: devicesTable.name,
      status: devicesTable.status,
    })
    .from(devicesTable)
    .where(
      and(
        eq(devicesTable.assetId, BigInt(assetId)),
        eq(devicesTable.userId, userId)
      )
    )
    .orderBy(asc(devicesTable.name));

  return rows.map((r) => ({ ...r, status: r.status ?? 'offline' }));
}

export async function getAvailableDevicesForUser(userId: bigint): Promise<AssignedDevice[]> {
  const rows = await db
    .select({
      id: devicesTable.id,
      serialNumber: devicesTable.serialNumber,
      name: devicesTable.name,
      status: devicesTable.status,
    })
    .from(devicesTable)
    .where(
      and(
        eq(devicesTable.userId, userId),
        isNull(devicesTable.assetId)
      )
    )
    .orderBy(asc(devicesTable.name));

  return rows.map((r) => ({ ...r, status: r.status ?? 'offline' }));
}

export async function assignDeviceToAsset(
  deviceId: bigint,
  assetId: number,
  userId: bigint
): Promise<void> {
  await db
    .update(devicesTable)
    .set({ assetId: BigInt(assetId) })
    .where(
      and(
        eq(devicesTable.id, deviceId),
        eq(devicesTable.userId, userId)
      )
    );
}

export async function unassignDeviceFromAsset(
  deviceId: bigint,
  userId: bigint
): Promise<void> {
  await db
    .update(devicesTable)
    .set({ assetId: null })
    .where(
      and(
        eq(devicesTable.id, deviceId),
        eq(devicesTable.userId, userId)
      )
    );
}
