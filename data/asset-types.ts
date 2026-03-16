import { db } from '@/src/db';
import { assetTypesTable } from '@/src/db/schema';
import { count, ilike, asc, desc, eq } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AssetType = {
  id: number;
  name: string;
  status: 'active' | 'inactive';
};

export type AssetTypeSortField = 'name' | 'status';

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CreateAssetTypeInput = {
  name: string;
  status?: 'active' | 'inactive';
};

export type UpdateAssetTypeInput = {
  name?: string;
  status?: 'active' | 'inactive';
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSortColumn(field: AssetTypeSortField) {
  switch (field) {
    case 'name':
      return assetTypesTable.name;
    case 'status':
      return assetTypesTable.status;
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getAssetTypesPaginated(opts: {
  page: number;
  pageSize: number;
  search?: string;
  sortField?: AssetTypeSortField;
  sortDir?: 'asc' | 'desc';
}): Promise<PaginatedResult<AssetType>> {
  const { page, pageSize, search, sortField = 'name', sortDir = 'asc' } = opts;
  const offset = (page - 1) * pageSize;

  const searchFilter = search
    ? ilike(assetTypesTable.name, `%${search}%`)
    : undefined;

  const sortColumn = getSortColumn(sortField);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = sortDir === 'desc' ? desc(sortColumn as any) : asc(sortColumn as any);

  const [{ total }] = await db
    .select({ total: count() })
    .from(assetTypesTable)
    .where(searchFilter);

  const rows = await db
    .select()
    .from(assetTypesTable)
    .where(searchFilter)
    .orderBy(order)
    .limit(pageSize)
    .offset(offset);

  return {
    data: rows as AssetType[],
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAssetTypeById(id: number): Promise<AssetType | null> {
  const [row] = await db
    .select()
    .from(assetTypesTable)
    .where(eq(assetTypesTable.id, id))
    .limit(1);
  return (row as AssetType) ?? null;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createAssetType(input: CreateAssetTypeInput): Promise<AssetType> {
  const [row] = await db
    .insert(assetTypesTable)
    .values({
      name: input.name,
      status: input.status ?? 'active',
    })
    .returning();
  return row as AssetType;
}

export async function updateAssetType(
  id: number,
  input: UpdateAssetTypeInput
): Promise<AssetType> {
  const [row] = await db
    .update(assetTypesTable)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.status !== undefined && { status: input.status }),
    })
    .where(eq(assetTypesTable.id, id))
    .returning();
  return row as AssetType;
}

export async function deleteAssetType(id: number): Promise<void> {
  await db.delete(assetTypesTable).where(eq(assetTypesTable.id, id));
}
