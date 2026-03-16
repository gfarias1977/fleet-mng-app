import { db } from '@/src/db';
import { geofenceTypesTable } from '@/src/db/schema';
import { count, ilike, or, asc, desc, eq } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GeofenceType = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
};

export type GeofenceTypeSortField = 'name' | 'description' | 'isActive' | 'createdAt';

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CreateGeofenceTypeInput = {
  name: string;
  description?: string | null;
  isActive?: boolean;
};

export type UpdateGeofenceTypeInput = {
  name?: string;
  description?: string | null;
  isActive?: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSortColumn(field: GeofenceTypeSortField) {
  switch (field) {
    case 'name':
      return geofenceTypesTable.name;
    case 'description':
      return geofenceTypesTable.description;
    case 'isActive':
      return geofenceTypesTable.isActive;
    case 'createdAt':
      return geofenceTypesTable.createdAt;
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getGeofenceTypesPaginated(opts: {
  page: number;
  pageSize: number;
  search?: string;
  sortField?: GeofenceTypeSortField;
  sortDir?: 'asc' | 'desc';
}): Promise<PaginatedResult<GeofenceType>> {
  const { page, pageSize, search, sortField = 'name', sortDir = 'asc' } = opts;
  const offset = (page - 1) * pageSize;

  const searchFilter = search
    ? or(
        ilike(geofenceTypesTable.name, `%${search}%`),
        ilike(geofenceTypesTable.description, `%${search}%`)
      )
    : undefined;

  const sortColumn = getSortColumn(sortField);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = sortDir === 'desc' ? desc(sortColumn as any) : asc(sortColumn as any);

  const [{ total }] = await db
    .select({ total: count() })
    .from(geofenceTypesTable)
    .where(searchFilter);

  const rows = await db
    .select()
    .from(geofenceTypesTable)
    .where(searchFilter)
    .orderBy(order)
    .limit(pageSize)
    .offset(offset);

  return {
    data: rows as GeofenceType[],
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getGeofenceTypeById(id: number): Promise<GeofenceType | null> {
  const [row] = await db
    .select()
    .from(geofenceTypesTable)
    .where(eq(geofenceTypesTable.id, id))
    .limit(1);
  return (row as GeofenceType) ?? null;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createGeofenceType(input: CreateGeofenceTypeInput): Promise<GeofenceType> {
  const [row] = await db
    .insert(geofenceTypesTable)
    .values({
      name: input.name,
      description: input.description ?? null,
      isActive: input.isActive ?? true,
    })
    .returning();
  return row as GeofenceType;
}

export async function updateGeofenceType(
  id: number,
  input: UpdateGeofenceTypeInput
): Promise<GeofenceType> {
  const [row] = await db
    .update(geofenceTypesTable)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    })
    .where(eq(geofenceTypesTable.id, id))
    .returning();
  return row as GeofenceType;
}

export async function deleteGeofenceType(id: number): Promise<void> {
  await db.delete(geofenceTypesTable).where(eq(geofenceTypesTable.id, id));
}
