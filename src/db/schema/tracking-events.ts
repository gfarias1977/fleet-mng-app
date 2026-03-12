// db/schema/tracking-events.ts
import { 
  pgTable, 
  bigserial, 
  bigint, 
  timestamp, 
  decimal, 
  // geometry, // Commented - not using PostGIS
  index,
  primaryKey
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { devicesTable } from './devices';
import { alertsTable } from './alerts';

export const trackingEventsTable = pgTable('tracking_events', {
  id: bigserial('tev_id', { mode: 'bigint' }).notNull(),
  deviceId: bigint('tev_device_id', { mode: 'bigint' }).references(() => devicesTable.id, { onDelete: 'cascade' }).notNull(),
  eventTimestamp: timestamp('tev_event_timestamp', { withTimezone: true }).notNull(),
  
  // Location (using lat/lng instead of PostGIS geometry)
  // location: geometry('tev_location', { type: 'point', srid: 4326 }),
  latitude: decimal('tev_latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: decimal('tev_longitude', { precision: 11, scale: 8 }).notNull(),
  
  // Movement data
  altitude: decimal('tev_altitude', { precision: 7, scale: 2 }),
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
  //additionalData: jsonb('tev_additional_data').default({}),
  
  createdAt: timestamp('tev_created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  // Primary key with partition
  pk: primaryKey({ columns: [table.id, table.eventTimestamp] }),
  
  // Indexes
  deviceTimeIdx: index('idx_tracking_events_device_time').on(table.deviceId, table.eventTimestamp),
  //locationIdx: index('idx_tracking_events_location').using('gist', table.location),
  timestampIdx: index('idx_tracking_events_timestamp').on(table.eventTimestamp),
  brinIdx: index('idx_tracking_events_brin').using('brin', table.eventTimestamp),
  //compositeIdx: index('idx_tracking_events_composite').on(table.deviceId, table.eventTimestamp, table.location),
  
  // Check constraint
  //headingCheck: check('heading_check', sql`${table.heading} BETWEEN 0 AND 360`),
}));

export const trackingEventsRelations = relations(trackingEventsTable, ({ one, many }) => ({
  device: one(devicesTable, { fields: [trackingEventsTable.deviceId], references: [devicesTable.id] }),
  alerts: many(alertsTable),
}));