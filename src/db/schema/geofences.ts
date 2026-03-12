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
  // geometry, // Removed - not using PostGIS
  index,
  check,
  bigint,
  smallint
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { usersTable } from './users';
import { geofenceTypesTable } from './geofence-types';
import { assetGeofenceAssignmentsTable } from './asset-geofence-assignments';
import { alertsTable  } from './alerts';
import { geofenceAlertRulesTable } from './geofence-alert-rules';

export const geofencesTable = pgTable('geofences', {
  id: bigserial('geo_id', { mode: 'bigint' }).primaryKey(),
  uuid: uuid('geo_uuid').defaultRandom().unique().notNull(),
  userId: bigint('geo_user_id', { mode: 'bigint' }).references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('geo_name', { length: 100 }).notNull(),
  description: text('geo_description'),
  geofenceTypeId: smallint('geo_geofence_type_id').references(() => geofenceTypesTable.id).notNull(),
  
  // PostGIS geometry column (commented out - using centerLat/Lng/radius instead)
  // geometry: geometry('geo_geometry', { type: 'polygon', srid: 4326 }),
  
  // For circular geofences (using these instead of PostGIS)
  centerLatitude: decimal('geo_center_latitude', { precision: 10, scale: 8 }),
  centerLongitude: decimal('geo_center_longitude', { precision: 11, scale: 8 }),
  radiusMeters: decimal('geo_radius_meters', { precision: 10, scale: 2 }),
  
  // Metadata
  //verticesGeojson: jsonb('geo_vertices_geojson'),
  //properties: jsonb('geo_properties').default({}),
  active: boolean('geo_active').default(true),
  
  createdAt: timestamp('geo_created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('geo_updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  // Spatial index (requires PostGIS, commented for non-PostGIS deployments)
  // geometryIdx: index('idx_geofences_geometry').using('gist', table.geometry),
  
  // Composite index
  userActiveIdx: index('idx_geofences_user_active').on(table.userId, table.active),
  
  // JSONB index
  //propertiesGinIdx: index('idx_geofences_properties_gin').using('gin', table.properties),
  
  // Check constraints
  validGeofenceCheck: check('valid_geofence', sql`
    (${table.geofenceTypeId} = 1 AND 
     ${table.centerLatitude} IS NOT NULL AND 
     ${table.centerLongitude} IS NOT NULL AND 
     ${table.radiusMeters} IS NOT NULL) OR
    (${table.geofenceTypeId} != 1)
  `),
  
  validCoordinatesCheck: check('valid_coordinates', sql`
    ${table.centerLatitude} BETWEEN -90 AND 90 AND
    ${table.centerLongitude} BETWEEN -180 AND 180 AND
    ${table.radiusMeters} > 0
  `),
}));

export const geofencesRelations = relations(geofencesTable, ({ one, many }) => ({
  user: one(usersTable, { fields: [geofencesTable.userId], references: [usersTable.id] }),
  type: one(geofenceTypesTable, { fields: [geofencesTable.geofenceTypeId], references: [geofenceTypesTable.id] }),
  assignments: many(assetGeofenceAssignmentsTable),
  alerts: many(alertsTable),
  alertRules: many(geofenceAlertRulesTable),
}));