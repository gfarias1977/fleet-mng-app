import { db } from '@/src/db';
import {
  devicesTable,
  deviceTypesTable,
  assetTable,
  deviceSensorsTable,
  sensorTable,
  sensorTypesTable,
} from '@/src/db/schema';
import { count, ilike, or, asc, desc, eq, and, notInArray } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DeviceRow = {
  id: bigint;
  serialNumber: string;
  name: string;
  deviceTypeId: number;
  deviceTypeName: string;
  assetId: bigint | null;
  assetNumber: string | null;
  brand: string | null;
  model: string | null;
  status: string;
  active: boolean;
  macAddress: string | null;
  registrationDate: Date | null;
  createdAt: Date | null;
};

export type DeviceSortField =
  | 'serialNumber'
  | 'name'
  | 'deviceTypeName'
  | 'brand'
  | 'model'
  | 'status'
  | 'active';

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CreateDeviceInput = {
  serialNumber: string;
  name: string;
  deviceTypeId: number;
  assetId?: number | null;
  brand?: string | null;
  model?: string | null;
  gateway?: string | null;
  macAddress?: string | null;
  active?: boolean;
};

export type UpdateDeviceInput = Partial<CreateDeviceInput>;

export type DeviceSensorRow = {
  id: bigint;
  sensorId: number;
  sensorName: string;
  customName: string | null;
  sensorTypeName: string;
  enabled: boolean;
};

export type SensorSelectRow = {
  id: number;
  name: string;
  sensorTypeName: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSortColumn(field: DeviceSortField) {
  switch (field) {
    case 'serialNumber':
      return devicesTable.serialNumber;
    case 'name':
      return devicesTable.name;
    case 'deviceTypeName':
      return deviceTypesTable.name;
    case 'brand':
      return devicesTable.brand;
    case 'model':
      return devicesTable.model;
    case 'status':
      return devicesTable.status;
    case 'active':
      return devicesTable.active;
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getDevicesPaginated(
  userId: bigint,
  opts: {
    page: number;
    pageSize: number;
    search?: string;
    sortField?: DeviceSortField;
    sortDir?: 'asc' | 'desc';
  }
): Promise<PaginatedResult<DeviceRow>> {
  const { page, pageSize, search, sortField = 'name', sortDir = 'asc' } = opts;
  const offset = (page - 1) * pageSize;

  const userFilter = eq(devicesTable.userId, userId);

  const searchFilter = search
    ? or(
        ilike(devicesTable.serialNumber, `%${search}%`),
        ilike(devicesTable.name, `%${search}%`),
        ilike(devicesTable.brand, `%${search}%`),
        ilike(devicesTable.model, `%${search}%`),
        ilike(devicesTable.status, `%${search}%`),
        ilike(deviceTypesTable.name, `%${search}%`)
      )
    : undefined;

  const whereClause = searchFilter ? and(userFilter, searchFilter) : userFilter;

  const sortColumn = getSortColumn(sortField);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = sortDir === 'desc' ? desc(sortColumn as any) : asc(sortColumn as any);

  const [{ total }] = await db
    .select({ total: count() })
    .from(devicesTable)
    .innerJoin(deviceTypesTable, eq(devicesTable.deviceTypeId, deviceTypesTable.id))
    .leftJoin(assetTable, eq(devicesTable.assetId, assetTable.id))
    .where(whereClause);

  const rows = await db
    .select({
      id: devicesTable.id,
      serialNumber: devicesTable.serialNumber,
      name: devicesTable.name,
      deviceTypeId: devicesTable.deviceTypeId,
      deviceTypeName: deviceTypesTable.name,
      assetId: devicesTable.assetId,
      assetNumber: assetTable.number,
      brand: devicesTable.brand,
      model: devicesTable.model,
      status: devicesTable.status,
      active: devicesTable.active,
      macAddress: devicesTable.macAddress,
      registrationDate: devicesTable.registrationDate,
      createdAt: devicesTable.createdAt,
    })
    .from(devicesTable)
    .innerJoin(deviceTypesTable, eq(devicesTable.deviceTypeId, deviceTypesTable.id))
    .leftJoin(assetTable, eq(devicesTable.assetId, assetTable.id))
    .where(whereClause)
    .orderBy(order)
    .limit(pageSize)
    .offset(offset);

  return {
    data: rows.map((r) => ({
      ...r,
      status: r.status ?? 'offline',
      active: r.active ?? true,
    })) as DeviceRow[],
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getDeviceById(id: bigint, userId: bigint): Promise<DeviceRow | null> {
  const [row] = await db
    .select({
      id: devicesTable.id,
      serialNumber: devicesTable.serialNumber,
      name: devicesTable.name,
      deviceTypeId: devicesTable.deviceTypeId,
      deviceTypeName: deviceTypesTable.name,
      assetId: devicesTable.assetId,
      assetNumber: assetTable.number,
      brand: devicesTable.brand,
      model: devicesTable.model,
      status: devicesTable.status,
      active: devicesTable.active,
      macAddress: devicesTable.macAddress,
      registrationDate: devicesTable.registrationDate,
      createdAt: devicesTable.createdAt,
    })
    .from(devicesTable)
    .innerJoin(deviceTypesTable, eq(devicesTable.deviceTypeId, deviceTypesTable.id))
    .leftJoin(assetTable, eq(devicesTable.assetId, assetTable.id))
    .where(and(eq(devicesTable.id, id), eq(devicesTable.userId, userId)))
    .limit(1);

  if (!row) return null;
  return { ...row, status: row.status ?? 'offline', active: row.active ?? true } as DeviceRow;
}

export async function getDeviceTypesForSelect(): Promise<{ id: number; name: string }[]> {
  return db
    .select({ id: deviceTypesTable.id, name: deviceTypesTable.name })
    .from(deviceTypesTable)
    .orderBy(asc(deviceTypesTable.name));
}

export async function getAssetsForSelect(): Promise<{ id: number; number: string }[]> {
  return db
    .select({ id: assetTable.id, number: assetTable.number })
    .from(assetTable)
    .orderBy(asc(assetTable.number));
}

// ---------------------------------------------------------------------------
// Sensor assignment queries
// ---------------------------------------------------------------------------

export async function getDeviceSensors(
  deviceId: bigint,
  userId: bigint
): Promise<DeviceSensorRow[]> {
  // Security: verify device belongs to userId via subquery join
  const rows = await db
    .select({
      id: deviceSensorsTable.id,
      sensorId: deviceSensorsTable.sensorId,
      sensorName: sensorTable.name,
      customName: deviceSensorsTable.name,
      sensorTypeName: sensorTypesTable.name,
      enabled: deviceSensorsTable.enabled,
    })
    .from(deviceSensorsTable)
    .innerJoin(sensorTable, eq(deviceSensorsTable.sensorId, sensorTable.id))
    .innerJoin(sensorTypesTable, eq(sensorTable.stId, sensorTypesTable.id))
    .innerJoin(devicesTable, eq(deviceSensorsTable.deviceId, devicesTable.id))
    .where(
      and(
        eq(deviceSensorsTable.deviceId, deviceId),
        eq(devicesTable.userId, userId)
      )
    )
    .orderBy(asc(sensorTable.name));

  return rows.map((r) => ({ ...r, enabled: r.enabled ?? true }));
}

export async function getAvailableSensors(deviceId: bigint): Promise<SensorSelectRow[]> {
  const assigned = db
    .select({ sensorId: deviceSensorsTable.sensorId })
    .from(deviceSensorsTable)
    .where(eq(deviceSensorsTable.deviceId, deviceId));

  const rows = await db
    .select({
      id: sensorTable.id,
      name: sensorTable.name,
      sensorTypeName: sensorTypesTable.name,
    })
    .from(sensorTable)
    .innerJoin(sensorTypesTable, eq(sensorTable.stId, sensorTypesTable.id))
    .where(
      and(
        notInArray(sensorTable.id, assigned),
        eq(sensorTable.status, 'active')
      )
    )
    .orderBy(asc(sensorTable.name));

  return rows;
}

export async function assignSensorToDevice(
  deviceId: bigint,
  sensorId: number,
  userId: bigint,
  customName?: string | null
): Promise<void> {
  // Verify device belongs to user
  const device = await db
    .select({ id: devicesTable.id })
    .from(devicesTable)
    .where(and(eq(devicesTable.id, deviceId), eq(devicesTable.userId, userId)))
    .limit(1);

  if (device.length === 0) throw new Error('Device not found or access denied.');

  await db.insert(deviceSensorsTable).values({
    deviceId,
    sensorId,
    name: customName ?? null,
  });
}

export async function unassignSensorFromDevice(
  deviceId: bigint,
  sensorId: number,
  userId: bigint
): Promise<void> {
  // Verify device belongs to user
  const device = await db
    .select({ id: devicesTable.id })
    .from(devicesTable)
    .where(and(eq(devicesTable.id, deviceId), eq(devicesTable.userId, userId)))
    .limit(1);

  if (device.length === 0) throw new Error('Device not found or access denied.');

  await db
    .delete(deviceSensorsTable)
    .where(
      and(
        eq(deviceSensorsTable.deviceId, deviceId),
        eq(deviceSensorsTable.sensorId, sensorId)
      )
    );
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createDevice(
  userId: bigint,
  input: CreateDeviceInput
): Promise<DeviceRow> {
  const [row] = await db
    .insert(devicesTable)
    .values({
      userId,
      serialNumber: input.serialNumber,
      name: input.name,
      deviceTypeId: input.deviceTypeId,
      assetId: input.assetId ? BigInt(input.assetId) : null,
      brand: input.brand ?? null,
      model: input.model ?? null,
      gateway: input.gateway ?? null,
      macAddress: input.macAddress ?? null,
      active: input.active ?? true,
    })
    .returning();

  const result = await getDeviceById(row.id, userId);
  if (!result) throw new Error('Failed to fetch created device.');
  return result;
}

export async function updateDevice(
  id: bigint,
  userId: bigint,
  input: UpdateDeviceInput
): Promise<DeviceRow> {
  await db
    .update(devicesTable)
    .set({
      ...(input.serialNumber !== undefined && { serialNumber: input.serialNumber }),
      ...(input.name !== undefined && { name: input.name }),
      ...(input.deviceTypeId !== undefined && { deviceTypeId: input.deviceTypeId }),
      ...(input.assetId !== undefined && { assetId: input.assetId ? BigInt(input.assetId) : null }),
      ...(input.brand !== undefined && { brand: input.brand }),
      ...(input.model !== undefined && { model: input.model }),
      ...(input.gateway !== undefined && { gateway: input.gateway }),
      ...(input.macAddress !== undefined && { macAddress: input.macAddress }),
      ...(input.active !== undefined && { active: input.active }),
    })
    .where(and(eq(devicesTable.id, id), eq(devicesTable.userId, userId)));

  const result = await getDeviceById(id, userId);
  if (!result) throw new Error('Failed to fetch updated device.');
  return result;
}

export async function deleteDevice(id: bigint, userId: bigint): Promise<void> {
  await db
    .delete(devicesTable)
    .where(and(eq(devicesTable.id, id), eq(devicesTable.userId, userId)));
}
