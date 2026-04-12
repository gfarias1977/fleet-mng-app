import { db } from '@/src/db';
import {
  alertsTable,
  alertNotificationsTable,
  alertTypesTable,
  devicesTable,
  geofencesTable,
} from '@/src/db/schema';
import { count, ilike, or, asc, desc, and, eq, inArray } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Types — existing (kept as-is)
// ---------------------------------------------------------------------------

export async function getAlertsByAssetAndGeofence(
  assetId: number,
  geofenceId: bigint,
  userId: bigint
) {
  return db
    .select({
      id: alertsTable.id,
      alertTimestamp: alertsTable.alertTimestamp,
      message: alertsTable.message,
      severity: alertsTable.severity,
      status: alertsTable.status,
      typeName: alertTypesTable.name,
      latitude: alertsTable.latitude,
      longitude: alertsTable.longitude,
    })
    .from(alertsTable)
    .innerJoin(devicesTable, eq(alertsTable.deviceId, devicesTable.id))
    .innerJoin(alertTypesTable, eq(alertsTable.alertTypeId, alertTypesTable.id))
    .where(
      and(
        eq(devicesTable.assetId, BigInt(assetId)),
        eq(alertsTable.geofenceId, geofenceId),
        eq(devicesTable.userId, userId)
      )
    )
    .orderBy(desc(alertsTable.alertTimestamp))
    .limit(50);
}

export type AlertRow = Awaited<ReturnType<typeof getAlertsByAssetAndGeofence>>[number];

export async function getNotificationsByAssetAndGeofence(
  assetId: number,
  geofenceId: bigint,
  userId: bigint
) {
  return db
    .select({
      id: alertNotificationsTable.id,
      notificationMethod: alertNotificationsTable.notificationMethod,
      destination: alertNotificationsTable.destination,
      subject: alertNotificationsTable.subject,
      body: alertNotificationsTable.body,
      status: alertNotificationsTable.status,
      sentAt: alertNotificationsTable.sentAt,
      createdAt: alertNotificationsTable.createdAt,
    })
    .from(alertNotificationsTable)
    .innerJoin(alertsTable, eq(alertNotificationsTable.alertId, alertsTable.id))
    .innerJoin(devicesTable, eq(alertsTable.deviceId, devicesTable.id))
    .where(
      and(
        eq(devicesTable.assetId, BigInt(assetId)),
        eq(alertsTable.geofenceId, geofenceId),
        eq(alertNotificationsTable.userId, userId)
      )
    )
    .orderBy(desc(alertNotificationsTable.createdAt))
    .limit(50);
}

export type NotificationRow = Awaited<ReturnType<typeof getNotificationsByAssetAndGeofence>>[number];

// ---------------------------------------------------------------------------
// Types — mantenedor
// ---------------------------------------------------------------------------

export type AlertListRow = {
  id: bigint;
  uuid: string;
  alertTypeId: number;
  alertTypeName: string;
  deviceId: bigint;
  deviceName: string;
  geofenceId: bigint | null;
  geofenceName: string | null;
  alertTimestamp: Date;
  latitude: string | null;
  longitude: string | null;
  message: string | null;
  severity: number | null;
  confidence: string | null;
  status: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type AlertSortField =
  | 'alertTypeName'
  | 'deviceName'
  | 'alertTimestamp'
  | 'severity'
  | 'status'
  | 'message'
  | 'createdAt';

export type PaginatedAlertsResult = {
  data: AlertListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CreateAlertInput = {
  alertTypeId: number;
  deviceId: bigint;
  geofenceId?: bigint | null;
  alertTimestamp: Date;
  latitude?: string | null;
  longitude?: string | null;
  message?: string | null;
  severity?: number;
  status?: string;
};

export type UpdateAlertInput = {
  message?: string | null;
  severity?: number;
  status?: string;
};

export type AlertTypeSelectOption = { id: number; name: string };
export type DeviceSelectOption = { id: bigint; name: string; serialNumber: string };
export type GeofenceSelectOption = { id: bigint; name: string };

// ---------------------------------------------------------------------------
// Sort helper
// ---------------------------------------------------------------------------

function getSortColumn(field: AlertSortField) {
  switch (field) {
    case 'alertTypeName':
      return alertTypesTable.name;
    case 'deviceName':
      return devicesTable.name;
    case 'alertTimestamp':
      return alertsTable.alertTimestamp;
    case 'severity':
      return alertsTable.severity;
    case 'status':
      return alertsTable.status;
    case 'message':
      return alertsTable.message;
    case 'createdAt':
      return alertsTable.createdAt;
  }
}

// ---------------------------------------------------------------------------
// Queries — mantenedor
// ---------------------------------------------------------------------------

export async function getAlertsPaginated(
  userId: bigint,
  opts: {
    page: number;
    pageSize: number;
    search?: string;
    sortField?: AlertSortField;
    sortDir?: 'asc' | 'desc';
  }
): Promise<PaginatedAlertsResult> {
  const { page, pageSize, search, sortField = 'alertTimestamp', sortDir = 'desc' } = opts;
  const offset = (page - 1) * pageSize;

  const userFilter = eq(devicesTable.userId, userId);

  const searchFilter = search
    ? or(
        ilike(alertsTable.message, `%${search}%`),
        ilike(alertsTable.status, `%${search}%`),
        ilike(alertTypesTable.name, `%${search}%`),
        ilike(devicesTable.name, `%${search}%`),
        ilike(geofencesTable.name, `%${search}%`)
      )
    : undefined;

  const whereClause = searchFilter ? and(userFilter, searchFilter) : userFilter;

  const sortColumn = getSortColumn(sortField);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = sortDir === 'desc' ? desc(sortColumn as any) : asc(sortColumn as any);

  const [{ total }] = await db
    .select({ total: count() })
    .from(alertsTable)
    .innerJoin(devicesTable, eq(alertsTable.deviceId, devicesTable.id))
    .innerJoin(alertTypesTable, eq(alertsTable.alertTypeId, alertTypesTable.id))
    .leftJoin(geofencesTable, eq(alertsTable.geofenceId, geofencesTable.id))
    .where(whereClause);

  const rows = await db
    .select({
      id: alertsTable.id,
      uuid: alertsTable.uuid,
      alertTypeId: alertsTable.alertTypeId,
      alertTypeName: alertTypesTable.name,
      deviceId: alertsTable.deviceId,
      deviceName: devicesTable.name,
      geofenceId: alertsTable.geofenceId,
      geofenceName: geofencesTable.name,
      alertTimestamp: alertsTable.alertTimestamp,
      latitude: alertsTable.latitude,
      longitude: alertsTable.longitude,
      message: alertsTable.message,
      severity: alertsTable.severity,
      confidence: alertsTable.confidence,
      status: alertsTable.status,
      createdAt: alertsTable.createdAt,
      updatedAt: alertsTable.updatedAt,
    })
    .from(alertsTable)
    .innerJoin(devicesTable, eq(alertsTable.deviceId, devicesTable.id))
    .innerJoin(alertTypesTable, eq(alertsTable.alertTypeId, alertTypesTable.id))
    .leftJoin(geofencesTable, eq(alertsTable.geofenceId, geofencesTable.id))
    .where(whereClause)
    .orderBy(order)
    .limit(pageSize)
    .offset(offset);

  return {
    data: rows as AlertListRow[],
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAlertTypesForSelect(): Promise<AlertTypeSelectOption[]> {
  return db
    .select({ id: alertTypesTable.id, name: alertTypesTable.name })
    .from(alertTypesTable)
    .orderBy(asc(alertTypesTable.name));
}

export async function getDevicesForSelect(userId: bigint): Promise<DeviceSelectOption[]> {
  return db
    .select({
      id: devicesTable.id,
      name: devicesTable.name,
      serialNumber: devicesTable.serialNumber,
    })
    .from(devicesTable)
    .where(eq(devicesTable.userId, userId))
    .orderBy(asc(devicesTable.name));
}

export async function getGeofencesForSelect(userId: bigint): Promise<GeofenceSelectOption[]> {
  return db
    .select({ id: geofencesTable.id, name: geofencesTable.name })
    .from(geofencesTable)
    .where(eq(geofencesTable.userId, userId))
    .orderBy(asc(geofencesTable.name));
}

// ---------------------------------------------------------------------------
// Mutations — mantenedor
// ---------------------------------------------------------------------------

export async function createAlert(
  userId: bigint,
  input: CreateAlertInput
): Promise<AlertListRow> {
  // Verify device belongs to user
  const [device] = await db
    .select({ id: devicesTable.id })
    .from(devicesTable)
    .where(and(eq(devicesTable.id, input.deviceId), eq(devicesTable.userId, userId)))
    .limit(1);
  if (!device) throw new Error('Dispositivo no encontrado o sin acceso.');

  const [row] = await db
    .insert(alertsTable)
    .values({
      alertTypeId: input.alertTypeId,
      deviceId: input.deviceId,
      geofenceId: input.geofenceId ?? null,
      alertTimestamp: input.alertTimestamp,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      message: input.message ?? null,
      severity: input.severity ?? 1,
      status: input.status ?? 'active',
    })
    .returning();

  const [result] = await db
    .select({
      id: alertsTable.id,
      uuid: alertsTable.uuid,
      alertTypeId: alertsTable.alertTypeId,
      alertTypeName: alertTypesTable.name,
      deviceId: alertsTable.deviceId,
      deviceName: devicesTable.name,
      geofenceId: alertsTable.geofenceId,
      geofenceName: geofencesTable.name,
      alertTimestamp: alertsTable.alertTimestamp,
      latitude: alertsTable.latitude,
      longitude: alertsTable.longitude,
      message: alertsTable.message,
      severity: alertsTable.severity,
      confidence: alertsTable.confidence,
      status: alertsTable.status,
      createdAt: alertsTable.createdAt,
      updatedAt: alertsTable.updatedAt,
    })
    .from(alertsTable)
    .innerJoin(devicesTable, eq(alertsTable.deviceId, devicesTable.id))
    .innerJoin(alertTypesTable, eq(alertsTable.alertTypeId, alertTypesTable.id))
    .leftJoin(geofencesTable, eq(alertsTable.geofenceId, geofencesTable.id))
    .where(
      and(
        eq(alertsTable.id, row.id),
        eq(alertsTable.alertTimestamp, row.alertTimestamp)
      )
    )
    .limit(1);

  return result as AlertListRow;
}

export async function updateAlert(
  id: bigint,
  alertTimestamp: Date,
  userId: bigint,
  input: UpdateAlertInput
): Promise<void> {
  // Verify ownership via device subquery
  const userDevices = db
    .select({ id: devicesTable.id })
    .from(devicesTable)
    .where(eq(devicesTable.userId, userId));

  await db
    .update(alertsTable)
    .set({
      ...(input.message !== undefined && { message: input.message }),
      ...(input.severity !== undefined && { severity: input.severity }),
      ...(input.status !== undefined && { status: input.status }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(alertsTable.id, id),
        eq(alertsTable.alertTimestamp, alertTimestamp),
        inArray(alertsTable.deviceId, userDevices)
      )
    );
}

export async function deleteAlert(
  id: bigint,
  alertTimestamp: Date,
  userId: bigint
): Promise<void> {
  const userDevices = db
    .select({ id: devicesTable.id })
    .from(devicesTable)
    .where(eq(devicesTable.userId, userId));

  await db
    .delete(alertsTable)
    .where(
      and(
        eq(alertsTable.id, id),
        eq(alertsTable.alertTimestamp, alertTimestamp),
        inArray(alertsTable.deviceId, userDevices)
      )
    );
}
