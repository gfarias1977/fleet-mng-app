import { db } from '@/src/db';
import {
  alertsTable,
  alertNotificationsTable,
  alertTypesTable,
  devicesTable,
} from '@/src/db/schema';
import { and, eq, desc } from 'drizzle-orm';

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
