// db/schema/geofences.ts
import {
  pgTable,
  bigserial,
  varchar,
  uuid,
  text,
  timestamp,
  boolean,
  decimal,
  index,
  bigint,
  smallint
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { usersTable } from './users';
import { geofenceTypesTable } from './geofence-types';
import { assetGeofenceAssignmentsTable } from './asset-geofence-assignments';
import { alertsTable  } from './alerts';
import { geofenceAlertRulesTable } from './geofence-alert-rules';
import { geofencePolygonPointsTable } from './geofence-polygon-points';
import { geofenceRectanglesTable } from './geofence-rectangles';

export const geofencesTable = pgTable('geofences', {
  id: bigserial('geo_id', { mode: 'bigint' }).primaryKey(),
  uuid: uuid('geo_uuid').defaultRandom().unique().notNull(),
  userId: bigint('geo_user_id', { mode: 'bigint' }).references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('geo_name', { length: 100 }).notNull(),
  description: text('geo_description'),
  geofenceTypeId: smallint('geo_geofence_type_id').references(() => geofenceTypesTable.id).notNull(),

  // For circular geofences
  centerLatitude: decimal('geo_center_latitude', { precision: 10, scale: 8 }),
  centerLongitude: decimal('geo_center_longitude', { precision: 11, scale: 8 }),
  radiusMeters: decimal('geo_radius_meters', { precision: 10, scale: 2 }),

  active: boolean('geo_active').default(true),

  createdAt: timestamp('geo_created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('geo_updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userActiveIdx: index('idx_geofences_user_active').on(table.userId, table.active),
}));

export const geofencesRelations = relations(geofencesTable, ({ one, many }) => ({
  user: one(usersTable, { fields: [geofencesTable.userId], references: [usersTable.id] }),
  type: one(geofenceTypesTable, { fields: [geofencesTable.geofenceTypeId], references: [geofenceTypesTable.id] }),
  assignments: many(assetGeofenceAssignmentsTable),
  alerts: many(alertsTable),
  alertRules: many(geofenceAlertRulesTable),
  polygonPoints: many(geofencePolygonPointsTable),
  rectangle: one(geofenceRectanglesTable, { fields: [geofencesTable.id], references: [geofenceRectanglesTable.geofenceId] }),
}));
