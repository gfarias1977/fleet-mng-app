import {
  pgTable,
  bigserial,
  bigint,
  decimal,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { geofencesTable } from './geofences';

export const geofenceRectanglesTable = pgTable('geofence_rectangles', {
  id: bigserial('gre_id', { mode: 'bigint' }).primaryKey(),
  geofenceId: bigint('gre_geo_id', { mode: 'bigint' })
    .references(() => geofencesTable.id, { onDelete: 'cascade' })
    .unique()
    .notNull(),
  nwLatitude: decimal('gre_nw_lat', { precision: 10, scale: 8 }).notNull(),
  nwLongitude: decimal('gre_nw_lng', { precision: 11, scale: 8 }).notNull(),
  seLatitude: decimal('gre_se_lat', { precision: 10, scale: 8 }).notNull(),
  seLongitude: decimal('gre_se_lng', { precision: 11, scale: 8 }).notNull(),
});

export const geofenceRectanglesRelations = relations(
  geofenceRectanglesTable,
  ({ one }) => ({
    geofence: one(geofencesTable, {
      fields: [geofenceRectanglesTable.geofenceId],
      references: [geofencesTable.id],
    }),
  })
);
