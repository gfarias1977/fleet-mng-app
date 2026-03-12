// db/schema/alert-notifications.ts
import { 
  pgTable, 
  bigserial, 
  bigint, 
  timestamp, 
  varchar, 
  text, 
  smallint,
  index,
  unique
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { alertsTable } from './alerts';
import { usersTable } from './users';

export const alertNotificationsTable = pgTable('alert_notifications', {
  id: bigserial('aln_id', { mode: 'bigint' }).primaryKey(),
  alertId: bigint('aln_alert_id', { mode: 'bigint' }).notNull(),
  alertTimestamp: timestamp('aln_alert_timestamp', { withTimezone: true }).notNull(),
  
  userId: bigint('aln_user_id', { mode: 'bigint' }).references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  notificationMethod: varchar('aln_notification_method', { length: 20 }),
  
  // Notification details
  destination: varchar('aln_notification_destination', { length: 255 }),
  subject: varchar('aln_notification_subject', { length: 255 }),
  body: text('aln_notification_body'),
  
  // Status
  status: varchar('aln_notification_status', { length: 20 }).default('pending'),
  sentAt: timestamp('aln_notification_sent_at', { withTimezone: true }),
  deliveredAt: timestamp('aln_notification_delivered_at', { withTimezone: true }),
  errorMessage: text('aln_notification_error_message'),
  
  // Retry logic
  retryCount: smallint('aln_notification_retry_count').default(0),
  maxRetries: smallint('aln_notification_max_retries').default(3),
  
  createdAt: timestamp('aln_notification_created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  // Indexes
  alertIdx: index('idx_notifications_alert').on(table.alertId),
  statusIdx: index('idx_notifications_status').on(table.status, table.createdAt),
  
  // Unique constraint
  uniqueNotification: unique('unique_notification').on(table.alertId, table.userId, table.notificationMethod),
}));

export const alertNotificationsRelations = relations(alertNotificationsTable, ({ one }) => ({
  alert: one(alertsTable, { 
    fields: [alertNotificationsTable.alertId], // Solo alertId, no alertTimestamp
    references: [alertsTable.id] 
  }),
  user: one(usersTable, { fields: [alertNotificationsTable.userId], references: [usersTable.id] }),
}));