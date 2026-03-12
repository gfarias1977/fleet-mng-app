// db/schema/geofence-types.ts
import { pgTable, smallserial, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { geofencesTable } from './geofences';

export const geofenceTypesTable = pgTable('geofence_types', {
  id: smallserial('get_id').primaryKey(),
  name: varchar('get_name', { length: 50 }).unique().notNull(),
  description: text('get_description'),
  isActive: boolean('get_is_active').default(true),
  createdAt: timestamp('get_created_at', { withTimezone: true }).defaultNow(),
});

export const geofenceTypesRelations = relations(geofenceTypesTable, ({ many }) => ({
  geofences: many(geofencesTable),
}));