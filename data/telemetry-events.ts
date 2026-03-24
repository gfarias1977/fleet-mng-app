import { db } from '@/src/db';
import { telemetryEventsTable, devicesTable } from '@/src/db/schema';
import { count, ilike, or, asc, desc, eq, and, sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TelemetryEventRow = {
  id: bigint;
  deviceId: bigint;
  deviceName: string;
  deviceSerial: string;
  eventTimestamp: Date;
  latitude: string;
  longitude: string;
  jsonData: unknown;
  createdAt: Date | null;
};

export type TelemetrySortField =
  | 'eventTimestamp'
  | 'latitude'
  | 'longitude'
  | 'deviceName'
  | 'createdAt';

export type UpdateTelemetryInput = {
  eventTimestamp?: Date;
  latitude?: string;
  longitude?: string;
  jsonData?: unknown;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSortColumn(field: TelemetrySortField) {
  switch (field) {
    case 'eventTimestamp':
      return telemetryEventsTable.eventTimestamp;
    case 'latitude':
      return telemetryEventsTable.latitude;
    case 'longitude':
      return telemetryEventsTable.longitude;
    case 'deviceName':
      return devicesTable.name;
    case 'createdAt':
      return telemetryEventsTable.createdAt;
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getTelemetryEventsPaginated(
  userId: bigint,
  opts: {
    page: number;
    pageSize: number;
    search?: string;
    sortField?: TelemetrySortField;
    sortDir?: 'asc' | 'desc';
  }
): Promise<PaginatedResult<TelemetryEventRow>> {
  const { page, pageSize, search, sortField = 'eventTimestamp', sortDir = 'desc' } = opts;
  const offset = (page - 1) * pageSize;

  const userFilter = eq(devicesTable.userId, userId);

  const searchFilter = search
    ? or(
        ilike(devicesTable.name, `%${search}%`),
        ilike(devicesTable.serialNumber, `%${search}%`),
        ilike(sql`${telemetryEventsTable.latitude}::text`, `%${search}%`),
        ilike(sql`${telemetryEventsTable.longitude}::text`, `%${search}%`),
        ilike(sql`${telemetryEventsTable.eventTimestamp}::text`, `%${search}%`)
      )
    : undefined;

  const whereClause = searchFilter ? and(userFilter, searchFilter) : userFilter;

  const sortColumn = getSortColumn(sortField);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = sortDir === 'desc' ? desc(sortColumn as any) : asc(sortColumn as any);

  const [{ total }] = await db
    .select({ total: count() })
    .from(telemetryEventsTable)
    .innerJoin(devicesTable, eq(telemetryEventsTable.deviceId, devicesTable.id))
    .where(whereClause);

  const rows = await db
    .select({
      id: telemetryEventsTable.id,
      deviceId: telemetryEventsTable.deviceId,
      deviceName: devicesTable.name,
      deviceSerial: devicesTable.serialNumber,
      eventTimestamp: telemetryEventsTable.eventTimestamp,
      latitude: telemetryEventsTable.latitude,
      longitude: telemetryEventsTable.longitude,
      jsonData: telemetryEventsTable.jsonData,
      createdAt: telemetryEventsTable.createdAt,
    })
    .from(telemetryEventsTable)
    .innerJoin(devicesTable, eq(telemetryEventsTable.deviceId, devicesTable.id))
    .where(whereClause)
    .orderBy(order)
    .limit(pageSize)
    .offset(offset);

  return {
    data: rows as TelemetryEventRow[],
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getTelemetryEventById(
  id: bigint,
  userId: bigint
): Promise<TelemetryEventRow | null> {
  const [row] = await db
    .select({
      id: telemetryEventsTable.id,
      deviceId: telemetryEventsTable.deviceId,
      deviceName: devicesTable.name,
      deviceSerial: devicesTable.serialNumber,
      eventTimestamp: telemetryEventsTable.eventTimestamp,
      latitude: telemetryEventsTable.latitude,
      longitude: telemetryEventsTable.longitude,
      jsonData: telemetryEventsTable.jsonData,
      createdAt: telemetryEventsTable.createdAt,
    })
    .from(telemetryEventsTable)
    .innerJoin(devicesTable, eq(telemetryEventsTable.deviceId, devicesTable.id))
    .where(and(eq(telemetryEventsTable.id, id), eq(devicesTable.userId, userId)))
    .limit(1);

  return row ?? null;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function updateTelemetryEvent(
  id: bigint,
  userId: bigint,
  input: UpdateTelemetryInput
): Promise<TelemetryEventRow> {
  const existing = await getTelemetryEventById(id, userId);
  if (!existing) throw new Error('Telemetry event not found or access denied.');

  await db
    .update(telemetryEventsTable)
    .set({
      ...(input.eventTimestamp !== undefined && { eventTimestamp: input.eventTimestamp }),
      ...(input.latitude !== undefined && { latitude: input.latitude }),
      ...(input.longitude !== undefined && { longitude: input.longitude }),
      ...(input.jsonData !== undefined && { jsonData: input.jsonData }),
    })
    .where(eq(telemetryEventsTable.id, id));

  const result = await getTelemetryEventById(id, userId);
  if (!result) throw new Error('Failed to fetch updated telemetry event.');
  return result;
}

export async function deleteTelemetryEvent(id: bigint, userId: bigint): Promise<void> {
  const existing = await getTelemetryEventById(id, userId);
  if (!existing) throw new Error('Telemetry event not found or access denied.');

  await db
    .delete(telemetryEventsTable)
    .where(eq(telemetryEventsTable.id, id));
}
