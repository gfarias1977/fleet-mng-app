// db/schema/sensor-types.ts
import { pgTable, smallserial, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { deviceSensorsTable  } from './device-sensors';

export const sensorTypesTable = pgTable('sensor_types', {
  id: smallserial('snt_id').primaryKey(),
  name: varchar('snt_name', { length: 50 }).unique().notNull(),
  //measurementUnit: varchar('snt_measurement_unit', { length: 20 }),
  //valueType: varchar('snt_value_type', { length: 20 }).default('numeric'),
  description: text('snt_description'),
  //minValue: decimal('snt_min_value', { precision: 10, scale: 2 }),
  //maxValue: decimal('snt_max_value', { precision: 10, scale: 2 }),
  isActive: boolean('snt_is_active').default(true),
  createdAt: timestamp('snt_created_at', { withTimezone: true }).defaultNow(),
});

export const sensorTypesRelations = relations(sensorTypesTable, ({ many }) => ({
  deviceSensors: many(deviceSensorsTable),
}));

