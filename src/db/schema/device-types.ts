// db/schema/device-types.ts
import { pgTable, smallserial, varchar, text, jsonb, boolean, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { devicesTable } from './devices';

export const deviceTypesTable = pgTable('device_types', {
  id: smallserial('dvt_id').primaryKey(),
  name: varchar('dvt_name', { length: 50 }).unique().notNull(),
  description: text('dvt_description'),
  capabilities: jsonb('dvt_capabilities').default([]),
  isActive: boolean('dvt_is_active').default(true),
  createdAt: timestamp('dvt_created_at', { withTimezone: true }).defaultNow(),
});

export const deviceTypesRelations = relations(deviceTypesTable, ({ many }) => ({
  devices: many(devicesTable),
}));