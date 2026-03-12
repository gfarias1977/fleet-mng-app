// db/schema/device-geofence-assignments.ts
import { 
  pgTable, 
  bigserial, 
  uuid, 
  bigint, 
  timestamp, 
  boolean, 
  smallint, 
  integer, 
  jsonb,
  index,
  unique,
  check
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { geofencesTable } from './geofences';
import { devicesTable } from './devices';

export const deviceGeofenceAssignmentsTable = pgTable('device_geofence_assignments', {
  id: bigserial('dvg_id', { mode: 'bigint' }).primaryKey(),
  uuid: uuid('dvg_uuid').defaultRandom().unique().notNull(),
  geofenceId: bigint('dvg_geo_id', { mode: 'bigint' }).references(() => geofencesTable.id, { onDelete: 'cascade' }).notNull(),
  deviceId: bigint('dvg_dev_id', { mode: 'bigint' }).references(() => devicesTable.id, { onDelete: 'cascade' }).notNull(),
  
  // Assignment period
  validFrom: timestamp('dvg_valid_from', { withTimezone: true }).defaultNow().notNull(),
  validUntil: timestamp('dvg_valid_until', { withTimezone: true }),
  isActive: boolean('dvg_is_active').default(true),
  
  // Assignment configuration
  priority: smallint('dvg_priority').default(0),
  alertOnEntry: boolean('dvg_alert_on_entry').default(true),
  alertOnExit: boolean('dvg_alert_on_exit').default(true),
  alertOnDwell: boolean('dvg_alert_on_dwell').default(false),
  dwellTimeThreshold: integer('dvg_dwell_time_threshold'),
  
  // Metadata
  properties: jsonb('dvg_properties').default({}),
  
  createdAt: timestamp('dvg_created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('dvg_updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  // Indexes
  deviceActiveIdx: index('idx_assignments_device_active').on(table.deviceId, table.isActive),
  geofenceActiveIdx: index('idx_assignments_geofence_active').on(table.geofenceId, table.isActive),
  
  // Unique constraint
  uniqueAssignment: unique('unique_geofence_device').on(table.geofenceId, table.deviceId, table.validFrom),
  
  // Check constraint
  validPeriod: check('valid_period', sql`
    ${table.validUntil} IS NULL OR ${table.validUntil} > ${table.validFrom}
  `),
}));

export const deviceGeofenceAssignmentsRelations = relations(deviceGeofenceAssignmentsTable, ({ one }) => ({
  geofence: one(geofencesTable, { fields: [deviceGeofenceAssignmentsTable.geofenceId], references: [geofencesTable.id] }),
  device: one(devicesTable, { fields: [deviceGeofenceAssignmentsTable.deviceId], references: [devicesTable.id] }),
}));