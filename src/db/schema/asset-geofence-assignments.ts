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
import { assetTable } from './assets';

export const assetGeofenceAssignmentsTable = pgTable('asset_geofence_assignments', {
  id: bigserial('dvg_id', { mode: 'bigint' }).primaryKey(),
  uuid: uuid('dvg_uuid').defaultRandom().unique().notNull(),
  geofenceId: bigint('dvg_geo_id', { mode: 'bigint' }).references(() => geofencesTable.id, { onDelete: 'cascade' }).notNull(),
  assetId: bigint('dvg_ass_id', { mode: 'bigint' }).references(() => assetTable.id, { onDelete: 'cascade' }).notNull(),
  
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
  assetActiveIdx: index('idx_assignments_asset_active').on(table.assetId, table.isActive),
  geofenceActiveIdx: index('idx_assignments_geofence_active').on(table.geofenceId, table.isActive),
  
  // Unique constraint
  uniqueAssignment: unique('unique_geofence_asset').on(table.geofenceId, table.assetId, table.validFrom),
  
  // Check constraint
  validPeriod: check('valid_period', sql`
    ${table.validUntil} IS NULL OR ${table.validUntil} > ${table.validFrom}
  `),
}));

export const assetGeofenceAssignmentsRelations = relations(assetGeofenceAssignmentsTable, ({ one }) => ({
  geofence: one(geofencesTable, { fields: [assetGeofenceAssignmentsTable.geofenceId], references: [geofencesTable.id] }),
  asset: one(assetTable, { fields: [assetGeofenceAssignmentsTable.assetId], references: [assetTable.id] }),
}));