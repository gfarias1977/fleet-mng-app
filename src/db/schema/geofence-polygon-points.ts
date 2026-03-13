import {
  pgTable,
  bigserial,
  bigint,
  integer,
  decimal,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { geofencesTable } from './geofences';

export const geofencePolygonPointsTable = pgTable(
  'geofence_polygon_points',
  {
    id: bigserial('gpp_id', { mode: 'bigint' }).primaryKey(),
    geofenceId: bigint('gpp_geo_id', { mode: 'bigint' })
      .references(() => geofencesTable.id, { onDelete: 'cascade' })
      .notNull(),
    pointOrder: integer('gpp_point_order').notNull(),
    latitude: decimal('gpp_latitude', { precision: 10, scale: 8 }).notNull(),
    longitude: decimal('gpp_longitude', { precision: 11, scale: 8 }).notNull(),
  },
  (t) => ({
    orderIdx: index('idx_gpp_geo_order').on(t.geofenceId, t.pointOrder),
  })
);

export const geofencePolygonPointsRelations = relations(
  geofencePolygonPointsTable,
  ({ one }) => ({
    geofence: one(geofencesTable, {
      fields: [geofencePolygonPointsTable.geofenceId],
      references: [geofencesTable.id],
    }),
  })
);
