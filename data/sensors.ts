import { db } from '@/src/db';
import { sensorTable, sensorTypesTable } from '@/src/db/schema';
import { count, ilike, or, asc, desc, eq } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SensorRow = {
  id: number;
  stId: number;
  sensorTypeName: string;
  name: string;
  model: string | null;
  brand: string | null;
  status: 'active' | 'inactive';
};

export type SensorSortField = 'name' | 'sensorTypeName' | 'brand' | 'model' | 'status';

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CreateSensorInput = {
  stId: number;
  name: string;
  model?: string | null;
  brand?: string | null;
  status?: 'active' | 'inactive';
};

export type UpdateSensorInput = {
  stId?: number;
  name?: string;
  model?: string | null;
  brand?: string | null;
  status?: 'active' | 'inactive';
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSortColumn(field: SensorSortField) {
  switch (field) {
    case 'name':
      return sensorTable.name;
    case 'sensorTypeName':
      return sensorTypesTable.name;
    case 'brand':
      return sensorTable.brand;
    case 'model':
      return sensorTable.model;
    case 'status':
      return sensorTable.status;
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getSensorsPaginated(opts: {
  page: number;
  pageSize: number;
  search?: string;
  sortField?: SensorSortField;
  sortDir?: 'asc' | 'desc';
}): Promise<PaginatedResult<SensorRow>> {
  const { page, pageSize, search, sortField = 'name', sortDir = 'asc' } = opts;
  const offset = (page - 1) * pageSize;

  const searchFilter = search
    ? or(
        ilike(sensorTable.name, `%${search}%`),
        ilike(sensorTable.brand, `%${search}%`),
        ilike(sensorTable.model, `%${search}%`),
        ilike(sensorTypesTable.name, `%${search}%`)
      )
    : undefined;

  const sortColumn = getSortColumn(sortField);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = sortDir === 'desc' ? desc(sortColumn as any) : asc(sortColumn as any);

  const [{ total }] = await db
    .select({ total: count() })
    .from(sensorTable)
    .innerJoin(sensorTypesTable, eq(sensorTable.stId, sensorTypesTable.id))
    .where(searchFilter);

  const rows = await db
    .select({
      id: sensorTable.id,
      stId: sensorTable.stId,
      sensorTypeName: sensorTypesTable.name,
      name: sensorTable.name,
      model: sensorTable.model,
      brand: sensorTable.brand,
      status: sensorTable.status,
    })
    .from(sensorTable)
    .innerJoin(sensorTypesTable, eq(sensorTable.stId, sensorTypesTable.id))
    .where(searchFilter)
    .orderBy(order)
    .limit(pageSize)
    .offset(offset);

  return {
    data: rows as SensorRow[],
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getSensorById(id: number): Promise<SensorRow | null> {
  const [row] = await db
    .select({
      id: sensorTable.id,
      stId: sensorTable.stId,
      sensorTypeName: sensorTypesTable.name,
      name: sensorTable.name,
      model: sensorTable.model,
      brand: sensorTable.brand,
      status: sensorTable.status,
    })
    .from(sensorTable)
    .innerJoin(sensorTypesTable, eq(sensorTable.stId, sensorTypesTable.id))
    .where(eq(sensorTable.id, id))
    .limit(1);
  return (row as SensorRow) ?? null;
}

export async function getSensorTypesForSelect(): Promise<{ id: number; name: string }[]> {
  return db
    .select({ id: sensorTypesTable.id, name: sensorTypesTable.name })
    .from(sensorTypesTable)
    .where(eq(sensorTypesTable.isActive, true));
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createSensor(input: CreateSensorInput): Promise<SensorRow> {
  const [inserted] = await db
    .insert(sensorTable)
    .values({
      stId: input.stId,
      name: input.name,
      model: input.model ?? null,
      brand: input.brand ?? null,
      status: input.status ?? 'active',
    })
    .returning();

  const row = await getSensorById(inserted.id);
  return row!;
}

export async function updateSensor(id: number, input: UpdateSensorInput): Promise<SensorRow> {
  await db
    .update(sensorTable)
    .set({
      ...(input.stId !== undefined && { stId: input.stId }),
      ...(input.name !== undefined && { name: input.name }),
      ...(input.model !== undefined && { model: input.model }),
      ...(input.brand !== undefined && { brand: input.brand }),
      ...(input.status !== undefined && { status: input.status }),
    })
    .where(eq(sensorTable.id, id));

  const row = await getSensorById(id);
  return row!;
}

export async function deleteSensor(id: number): Promise<void> {
  await db.delete(sensorTable).where(eq(sensorTable.id, id));
}
