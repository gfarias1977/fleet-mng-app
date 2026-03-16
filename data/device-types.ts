import { db } from '@/src/db';
import { deviceTypesTable } from '@/src/db/schema';
import { count, ilike, or, asc, desc, eq } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DeviceType = {
  id: number;
  name: string;
  description: string | null;
  capabilities: string[] | null;
  isActive: boolean | null;
  createdAt: Date | null;
};

export type DeviceTypeSortField = 'name' | 'description' | 'isActive' | 'createdAt';

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CreateDeviceTypeInput = {
  name: string;
  description?: string | null;
  capabilities?: string[];
  isActive?: boolean;
};

export type UpdateDeviceTypeInput = {
  name?: string;
  description?: string | null;
  capabilities?: string[];
  isActive?: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSortColumn(field: DeviceTypeSortField) {
  switch (field) {
    case 'name':
      return deviceTypesTable.name;
    case 'description':
      return deviceTypesTable.description;
    case 'isActive':
      return deviceTypesTable.isActive;
    case 'createdAt':
      return deviceTypesTable.createdAt;
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getDeviceTypesPaginated(opts: {
  page: number;
  pageSize: number;
  search?: string;
  sortField?: DeviceTypeSortField;
  sortDir?: 'asc' | 'desc';
}): Promise<PaginatedResult<DeviceType>> {
  const { page, pageSize, search, sortField = 'name', sortDir = 'asc' } = opts;
  const offset = (page - 1) * pageSize;

  const searchFilter = search
    ? or(
        ilike(deviceTypesTable.name, `%${search}%`),
        ilike(deviceTypesTable.description, `%${search}%`)
      )
    : undefined;

  const sortColumn = getSortColumn(sortField);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = sortDir === 'desc' ? desc(sortColumn as any) : asc(sortColumn as any);

  const [{ total }] = await db
    .select({ total: count() })
    .from(deviceTypesTable)
    .where(searchFilter);

  const rows = await db
    .select()
    .from(deviceTypesTable)
    .where(searchFilter)
    .orderBy(order)
    .limit(pageSize)
    .offset(offset);

  return {
    data: rows.map((r) => ({
      ...r,
      capabilities: (r.capabilities as unknown as string[]) ?? null,
    })) as DeviceType[],
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getDeviceTypeById(id: number): Promise<DeviceType | null> {
  const [row] = await db
    .select()
    .from(deviceTypesTable)
    .where(eq(deviceTypesTable.id, id))
    .limit(1);
  if (!row) return null;
  return {
    ...row,
    capabilities: (row.capabilities as unknown as string[]) ?? null,
  } as DeviceType;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createDeviceType(input: CreateDeviceTypeInput): Promise<DeviceType> {
  const [row] = await db
    .insert(deviceTypesTable)
    .values({
      name: input.name,
      description: input.description ?? null,
      capabilities: input.capabilities ?? [],
      isActive: input.isActive ?? true,
    })
    .returning();
  return {
    ...row,
    capabilities: (row.capabilities as unknown as string[]) ?? null,
  } as DeviceType;
}

export async function updateDeviceType(
  id: number,
  input: UpdateDeviceTypeInput
): Promise<DeviceType> {
  const [row] = await db
    .update(deviceTypesTable)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.capabilities !== undefined && { capabilities: input.capabilities }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    })
    .where(eq(deviceTypesTable.id, id))
    .returning();
  return {
    ...row,
    capabilities: (row.capabilities as unknown as string[]) ?? null,
  } as DeviceType;
}

export async function deleteDeviceType(id: number): Promise<void> {
  await db.delete(deviceTypesTable).where(eq(deviceTypesTable.id, id));
}
