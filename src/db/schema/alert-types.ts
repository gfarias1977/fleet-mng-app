// db/schema/alert-types.ts
import { pgTable, smallserial, varchar, text, smallint, boolean, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { alertsTable } from './alerts';
import { geofenceAlertRulesTable } from './geofence-alert-rules';

export const alertTypesTable = pgTable('alert_types', {
  id: smallserial('alt_id').primaryKey(),
  name: varchar('alt_name', { length: 50 }).unique().notNull(),
  category: varchar('alt_category', { length: 50 }),
  description: text('alt_description'),
  priority: smallint('alt_priority').default(1),
  requiresAcknowledgment: boolean('alt_requires_acknowledgment').default(false),
  defaultMessage: text('alt_default_message'),
  isActive: boolean('alt_is_active').default(true),
  createdAt: timestamp('alt_created_at', { withTimezone: true }).defaultNow(),
});

export const alertTypesRelations = relations(alertTypesTable, ({ many }) => ({
  alerts: many(alertsTable),
  alertRules: many(geofenceAlertRulesTable),
}));