// db/schema/tracking-events.ts
import { 
  pgTable, 
  bigserial, 
  bigint, 
  timestamp, 
  decimal,
  jsonb,
  // geometry, // Commented - not using PostGIS
  index,
  primaryKey
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { devicesTable } from './devices';
import { alertsTable } from './alerts';

export const telemetryEventsTable = pgTable('telemetry_events', {
  id: bigserial('tev_id', { mode: 'bigint' }).notNull(),
  deviceId: bigint('tev_device_id', { mode: 'bigint' }).references(() => devicesTable.id, { onDelete: 'cascade' }).notNull(),
  eventTimestamp: timestamp('tev_event_timestamp', { withTimezone: true }).notNull(),
  
  // Location (using lat/lng instead of PostGIS geometry)
  // location: geometry('tev_location', { type: 'point', srid: 4326 }),
  latitude: decimal('tev_latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: decimal('tev_longitude', { precision: 11, scale: 8 }).notNull(),
  
  // Movement data
  //speed: decimal('tev_speed', { precision: 5, scale: 2 }),
  //heading: smallint('tev_heading'),
  
  // Accuracy
  //horizontalAccuracy: decimal('tev_horizontal_accuracy', { precision: 5, scale: 2 }),
  //verticalAccuracy: decimal('tev_vertical_accuracy', { precision: 5, scale: 2 }),
  //speedAccuracy: decimal('tev_speed_accuracy', { precision: 5, scale: 2 }),
  //headingAccuracy: decimal('tev_heading_accuracy', { precision: 5, scale: 2 }),
  
  // Location metadata
  //locationProvider: varchar('tev_location_provider', { length: 20 }),
  //satellitesUsed: smallint('tev_satellites_used'),
  //fixQuality: smallint('tev_fix_quality'),
  
  // Additional data
  jsonData: jsonb('tev_json_data'),
  
  createdAt: timestamp('tev_created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  // Primary key with partition
  pk: primaryKey({ columns: [table.id, table.eventTimestamp] }),
  
  // Indexes
  deviceTimeIdx: index('idx_telemetry_events_device_time').on(table.deviceId, table.eventTimestamp),
  //locationIdx: index('idx_telemetry_events_location').using('gist', table.location),
  timestampIdx: index('idx_telemetry_events_timestamp').on(table.eventTimestamp),
  brinIdx: index('idx_telemetry_events_brin').using('brin', table.eventTimestamp),
  //compositeIdx: index('idx_telemetry_events_composite').on(table.deviceId, table.eventTimestamp, table.location),
  
  // Check constraint
  //headingCheck: check('heading_check', sql`${table.heading} BETWEEN 0 AND 360`),
}));

export const telemetryEventsRelations = relations(telemetryEventsTable, ({ one, many }) => ({
  device: one(devicesTable, { fields: [telemetryEventsTable.deviceId], references: [devicesTable.id] }),
  alerts: many(alertsTable),
}));