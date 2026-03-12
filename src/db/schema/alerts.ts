// db/schema/alerts.ts
import { 
  pgTable, 
  bigserial, 
  uuid, 
  smallint, 
  bigint, 
  timestamp, 
  // geometry, // Commented - not using PostGIS
  decimal, 
  text, 
  jsonb, 
  varchar,
  index,
  primaryKey
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { alertTypesTable } from './alert-types';
import { geofencesTable } from './geofences';
import { devicesTable } from './devices';
import { alertNotificationsTable } from './alert-notifications';


export const alertsTable = pgTable('alerts', {
  id: bigserial('alr_id', { mode: 'bigint' }).notNull(),
  uuid: uuid('alr_uuid').defaultRandom().unique().notNull(),
  alertTypeId: smallint('alr_alt_id').references(() => alertTypesTable.id).notNull(),
  
  // Related entities
  geofenceId: bigint('alr_geofence_id', { mode: 'bigint' }).references(() => geofencesTable.id, { onDelete: 'set null' }),
  deviceId: bigint('alr_device_id', { mode: 'bigint' }).references(() => devicesTable.id, { onDelete: 'cascade' }).notNull(),
  trackingEventId: bigint('alr_tracking_event_id', { mode: 'bigint' }),
  
  // Alert details
  alertTimestamp: timestamp('alr_timestamp', { withTimezone: true }).notNull(),
  // location: geometry('alr_location', { type: 'point', srid: 4326 }), // Commented - using lat/lng
  latitude: decimal('alr_latitude', { precision: 10, scale: 8 }),
  longitude: decimal('alr_longitude', { precision: 11, scale: 8 }),
  
  // Alert data
  message: text('alr_message'),
  severity: smallint('alr_severity').default(1),
  confidence: decimal('alr_confidence', { precision: 3, scale: 2 }).default('1.00'),
  alertData: jsonb('alr_data').default({}),
  
  // Status
  status: varchar('alr_status', { length: 20 }).default('active'),
  //acknowledgedAt: timestamp('alr_acknowledged_at', { withTimezone: true }),
  //acknowledgedBy: bigint('alr_acknowledged_by', { mode: 'bigint' }).references(() => usersTable.id),
  //resolvedAt: timestamp('alr_alert_resolved_at', { withTimezone: true }),
  //resolvedBy: bigint('alr_alert_resolved_by', { mode: 'bigint' }).references(() => usersTable.id),
  //resolutionNotes: text('alr_alert_resolution_notes'),
  
  createdAt: timestamp('alr_alert_created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('alr_alert_updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  // Primary key
  pk: primaryKey({ columns: [table.id, table.alertTimestamp] }),
  
  // Indexes
  deviceTimeIdx: index('idx_alerts_device_time').on(table.deviceId, table.alertTimestamp),
  geofenceTimeIdx: index('idx_alerts_geofence_time').on(table.geofenceId, table.alertTimestamp),
  statusTimeIdx: index('idx_alerts_status_time').on(table.status, table.alertTimestamp),
  // locationIdx: index('idx_alerts_location').using('gist', table.location), // Requires PostGIS
  activeIdx: index('idx_active_alerts').on(table.deviceId, table.alertTimestamp).where(sql`alr_status = 'active'`),
}));

export const alertsRelations = relations(alertsTable, ({ one, many }) => ({
  alertType: one(alertTypesTable, { fields: [alertsTable.alertTypeId], references: [alertTypesTable.id] }),
  geofence: one(geofencesTable, { fields: [alertsTable.geofenceId], references: [geofencesTable.id] }),
  device: one(devicesTable, { fields: [alertsTable.deviceId], references: [devicesTable.id] }),
  //acknowledgedByUser: one(usersTable, { fields: [alertsTable.acknowledgedBy], references: [usersTable.id], relationName: 'acknowledgedBy' }),
  //resolvedByUser: one(usersTable, { fields: [alertsTable.resolvedBy], references: [usersTable.id], relationName: 'resolvedBy' }),
  notifications: many(alertNotificationsTable),
}));

