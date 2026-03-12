// db/schema/device-sensors.ts
import { 
  pgTable, 
  bigserial, 
  bigint, 
  smallint, 
  varchar, 
  boolean, 
  timestamp,
  unique
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { devicesTable } from './devices';
import { sensorTable } from './sensors';

export const deviceSensorsTable = pgTable('device_sensors', {
  id: bigserial('dvs_id', { mode: 'bigint' }).primaryKey(),
  deviceId: bigint('dvs_dev_id', { mode: 'bigint' }).references(() => devicesTable.id, { onDelete: 'cascade' }).notNull(),
  sensorId: smallint('dvs_sns_id').references(() => sensorTable.id).notNull(),
  
  name: varchar('dvs_name', { length: 50 }),
  //reference: varchar('dvs_reference', { length: 100 }),
  enabled: boolean('dvs_enabled').default(true),
  
  // Reading configuration
  //readingFrequency: integer('dvs_reading_frequency'),
  //precision: decimal('dvs_precision', { precision: 5, scale: 2 }),
  //calibrationOffset: decimal('dvs_calibration_offset', { precision: 10, scale: 2 }).default(0),
  //calibrationFactor: decimal('dvs_calibration_factor', { precision: 5, scale: 2 }).default(1),
  
  // Alert thresholds
  //minThreshold: decimal('dvs_min_threshold', { precision: 10, scale: 2 }),
  //maxThreshold: decimal('dvs_max_threshold', { precision: 10, scale: 2 }),
  
  // Metadata
  //configuration: jsonb('dvs_configuration').default({}),
  //lastReading: timestamp('dvs_last_reading', { withTimezone: true }),
  //lastValue: decimal('dvs_last_value', { precision: 10, scale: 2 }),
  
  createdAt: timestamp('dvs_created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('dvs_updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  // Unique constraint
  uniqueSensor: unique('unique_device_sensor').on(table.deviceId, table.sensorId),
  
  // Check constraint
 // validThresholds: check('valid_thresholds', sql`
  //  ${table.minThreshold} IS NULL OR 
  //  ${table.maxThreshold} IS NULL OR 
  //  ${table.minThreshold} <= ${table.maxThreshold}
  //`),
}));

export const deviceSensorsRelations = relations(deviceSensorsTable, ({ one, many }) => ({
  device: one(devicesTable, { fields: [deviceSensorsTable.deviceId], references: [devicesTable.id] }),
  sensor: one(sensorTable, { fields: [deviceSensorsTable.sensorId], references: [sensorTable.id] }),

}));