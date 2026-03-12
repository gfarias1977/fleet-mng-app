// db/schema/geofence-alert-rules.ts
import { 
  pgTable, 
  bigserial, 
  bigint, 
  smallint, 
  varchar, 
  decimal, 
  jsonb, 
  integer, 
  text, 
  boolean,
  timestamp,
  unique
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { geofencesTable } from './geofences';
import { alertTypesTable } from './alert-types';

export const geofenceAlertRulesTable = pgTable('geofence_alert_rules', {
  id: bigserial('gar_id', { mode: 'bigint' }).primaryKey(),
  geofenceId: bigint('gar_geofence_id', { mode: 'bigint' }).references(() => geofencesTable.id, { onDelete: 'cascade' }).notNull(),
  alertTypeId: smallint('gar_alert_type_id').references(() => alertTypesTable.id).notNull(),
  
  // Rule conditions
  conditionType: varchar('gar_condition_type', { length: 50 }),
  thresholdValue: decimal('gar_threshold_value', { precision: 10, scale: 2 }),
  thresholdUnit: varchar('gar_threshold_unit', { length: 20 }),
  
  // Time restrictions
  timeRestriction: jsonb('gar_time_restriction'),
  
  // Rule configuration
  cooldownPeriod: integer('gar_cooldown_period'),
  minimumDuration: integer('gar_minimum_duration'),
  
  // Action configuration
  notifyUsers: jsonb('gar_notify_users').default([]),
  notificationChannels: jsonb('gar_notification_channels').default(['email']),
  webhookUrl: text('gar_webhook_url'),
  
  active: boolean('gar_active').default(true),
  priority: smallint('gar_priority').default(1),
  
  createdAt: timestamp('gar_created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('gar_updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  // Unique constraint
  uniqueRule: unique('unique_geofence_alert').on(table.geofenceId, table.alertTypeId, table.conditionType),
}));

export const geofenceAlertRulesRelations = relations(geofenceAlertRulesTable, ({ one }) => ({
  geofence: one(geofencesTable, { fields: [geofenceAlertRulesTable.geofenceId], references: [geofencesTable.id] }),
  alertType: one(alertTypesTable, { fields: [geofenceAlertRulesTable.alertTypeId], references: [alertTypesTable.id] }),
}));