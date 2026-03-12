import { db } from '@/src/db';
import { alertsTable, alertTypesTable, alertNotificationsTable, devicesTable, geofenceAlertRulesTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function resolveAlertTypeId(name: string): Promise<number> {
  const [alertType] = await db
    .select({ id: alertTypesTable.id })
    .from(alertTypesTable)
    .where(eq(alertTypesTable.name, name))
    .limit(1);

  if (!alertType) {
    throw new Error(`Alert type '${name}' not found. Run db:seed first.`);
  }

  return alertType.id;
}

export interface AlertRule {
  conditionType: string;
  cooldownPeriod: number;
  minimumDuration: number;
  notifyUsers: string[];
  notificationChannels: string[];
  priority: number;
  alertTypeId: number;
}

export async function loadGeofenceAlertRules(geofenceId: bigint): Promise<AlertRule[]> {
  const rows = await db
    .select({
      conditionType: geofenceAlertRulesTable.conditionType,
      cooldownPeriod: geofenceAlertRulesTable.cooldownPeriod,
      minimumDuration: geofenceAlertRulesTable.minimumDuration,
      notifyUsers: geofenceAlertRulesTable.notifyUsers,
      notificationChannels: geofenceAlertRulesTable.notificationChannels,
      priority: geofenceAlertRulesTable.priority,
      alertTypeId: geofenceAlertRulesTable.alertTypeId,
    })
    .from(geofenceAlertRulesTable)
    .where(eq(geofenceAlertRulesTable.geofenceId, geofenceId));

  return rows.map((r) => ({
    conditionType: r.conditionType ?? '',
    cooldownPeriod: r.cooldownPeriod ?? 0,
    minimumDuration: r.minimumDuration ?? 0,
    notifyUsers: (r.notifyUsers as string[]) ?? [],
    notificationChannels: (r.notificationChannels as string[]) ?? [],
    priority: r.priority ?? 1,
    alertTypeId: r.alertTypeId,
  }));
}

export async function createGeofenceAlert(input: {
  alertTypeId: number;
  deviceId: bigint;
  geofenceId: bigint;
  trackingEventId: bigint;
  lat: number;
  lng: number;
  alertTimestamp: Date;
  message: string;
  severity?: number;
}): Promise<{ id: bigint; alertTimestamp: Date }> {
  const [alert] = await db
    .insert(alertsTable)
    .values({
      alertTypeId: input.alertTypeId,
      deviceId: input.deviceId,
      geofenceId: input.geofenceId,
      trackingEventId: input.trackingEventId,
      alertTimestamp: input.alertTimestamp,
      latitude: input.lat.toString(),
      longitude: input.lng.toString(),
      message: input.message,
      severity: input.severity ?? 2,
      status: 'active',
    })
    .returning();

  return { id: alert.id, alertTimestamp: alert.alertTimestamp };
}

export async function createAlertNotification(input: {
  alertId: bigint;
  alertTimestamp: Date;
  userId: bigint;
  userEmail: string;
  deviceName: string;
  message: string;
  notificationMethod?: string;
  subject?: string;
}): Promise<void> {
  await db
    .insert(alertNotificationsTable)
    .values({
      alertId: input.alertId,
      alertTimestamp: input.alertTimestamp,
      userId: input.userId,
      notificationMethod: input.notificationMethod ?? 'in_app',
      destination: input.userEmail,
      subject: input.subject ?? `[ALERT] ${input.deviceName} — Geofence Exit`,
      body: input.message,
      status: 'sent',
      sentAt: input.alertTimestamp,
    })
    .onConflictDoNothing();
}

export async function updateDeviceStatus(
  deviceId: bigint,
  status: string
): Promise<void> {
  await db
    .update(devicesTable)
    .set({ status })
    .where(eq(devicesTable.id, deviceId));
}
