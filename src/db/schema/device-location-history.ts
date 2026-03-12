// db/schema/device-location-history.ts
import { 
  pgTable, 
  bigserial, 
  bigint, 
  date, 
  smallint, 
  integer, 
  decimal, 
  // geometry, // Commented - not using PostGIS
  jsonb,
  timestamp,
  index,
  unique
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { devicesTable } from './devices';

export const deviceLocationHistoryTable = pgTable('device_location_history', {
  id: bigserial('dvl_id', { mode: 'bigint' }).primaryKey(),
  deviceId: bigint('dvl_dev_id', { mode: 'bigint' }).references(() => devicesTable.id, { onDelete: 'cascade' }).notNull(),
  
  // Period
  periodDate: date('dvl_period_date').notNull(),
  periodHour: smallint('dvl_period_hour'),
  
  // Statistics
  totalPoints: integer('dvl_total_points').default(0),
  totalDistance: decimal('dvl_total_distance', { precision: 10, scale: 2 }),
  totalMovingTime: integer('dvl_total_moving_time'),
  totalIdleTime: integer('dvl_total_idle_time'),
  averageSpeed: decimal('dvl_average_speed', { precision: 5, scale: 2 }),
  maxSpeed: decimal('dvl_max_speed', { precision: 5, scale: 2 }),
  
  // Location summary (using min/max lat/lng instead of PostGIS)
  // startLocation: geometry('dvl_start_location', { type: 'point', srid: 4326 }),
  // endLocation: geometry('dvl_end_location', { type: 'point', srid: 4326 }),
  
  // Bounding box
  minLatitude: decimal('dvl_min_latitude', { precision: 10, scale: 8 }),
  maxLatitude: decimal('dvl_max_latitude', { precision: 10, scale: 8 }),
  minLongitude: decimal('dvl_min_longitude', { precision: 11, scale: 8 }),
  maxLongitude: decimal('dvl_max_longitude', { precision: 11, scale: 8 }),
  
  // Additional data
  additionalData: jsonb('dvl_additional_data').default({}),
  
  createdAt: timestamp('dvl_created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('dvl_updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  // Unique constraint
  uniquePeriod: unique('unique_device_period').on(table.deviceId, table.periodDate, table.periodHour),
  
  // Indexes
  deviceDateIdx: index('idx_location_history_device_date').on(table.deviceId, table.periodDate),
  // startLocationIdx: index('idx_location_history_start').using('gist', table.startLocation), // Requires PostGIS
  // endLocationIdx: index('idx_location_history_end').using('gist', table.endLocation), // Requires PostGIS
}));

export const deviceLocationHistoryRelations = relations(deviceLocationHistoryTable, ({ one }) => ({
  device: one(devicesTable, { fields: [deviceLocationHistoryTable.deviceId], references: [devicesTable.id] }),
}));