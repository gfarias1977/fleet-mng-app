import { db } from '@/src/db';
import { sensorTypesTable } from '@/src/db/schema';
import { count, ilike, or, asc, desc, eq } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SensorType = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
};

export type SensorTypeSortField = 'name' | 'description' | 'isActive' | 'createdAt';

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CreateSensorTypeInput = {
  name: string;
  description?: string | null;
  isActive?: boolean;
};

export type UpdateSensorTypeInput = {
  name?: string;
  description?: string | null;
  isActive?: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSortColumn(field: SensorTypeSortField) {
  switch (field) {
    case 'name':
      return sensorTypesTable.name;
    case 'description':
      return sensorTypesTable.description;
    case 'isActive':
      return sensorTypesTable.isActive;
    case 'createdAt':
      return sensorTypesTable.createdAt;
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getSensorTypesPaginated(opts: {
  page: number;
  pageSize: number;
  search?: string;
  sortField?: SensorTypeSortField;
  sortDir?: 'asc' | 'desc';
}): Promise<PaginatedResult<SensorType>> {
  const { page, pageSize, search, sortField = 'name', sortDir = 'asc' } = opts;
  const offset = (page - 1) * pageSize;

  const searchFilter = search
    ? or(
        ilike(sensorTypesTable.name, `%${search}%`),
        ilike(sensorTypesTable.description, `%${search}%`)
      )
    : undefined;

  const sortColumn = getSortColumn(sortField);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = sortDir === 'desc' ? desc(sortColumn as any) : asc(sortColumn as any);

  const [{ total }] = await db
    .select({ total: count() })
    .from(sensorTypesTable)
    .where(searchFilter);

  const rows = await db
    .select()
    .from(sensorTypesTable)
    .where(searchFilter)
    .orderBy(order)
    .limit(pageSize)
    .offset(offset);

  return {
    data: rows as SensorType[],
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getSensorTypeById(id: number): Promise<SensorType | null> {
  const [row] = await db
    .select()
    .from(sensorTypesTable)
    .where(eq(sensorTypesTable.id, id))
    .limit(1);
  return (row as SensorType) ?? null;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createSensorType(input: CreateSensorTypeInput): Promise<SensorType> {
  const [row] = await db
    .insert(sensorTypesTable)
    .values({
      name: input.name,
      description: input.description ?? null,
      isActive: input.isActive ?? true,
    })
    .returning();
  return row as SensorType;
}

export async function updateSensorType(
  id: number,
  input: UpdateSensorTypeInput
): Promise<SensorType> {
  const [row] = await db
    .update(sensorTypesTable)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    })
    .where(eq(sensorTypesTable.id, id))
    .returning();
  return row as SensorType;
}

export async function deleteSensorType(id: number): Promise<void> {
  await db.delete(sensorTypesTable).where(eq(sensorTypesTable.id, id));
}
