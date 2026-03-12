// db/schema/users.ts
import { 
  pgTable, 
  bigserial, 
  varchar, 
  uuid, 
  timestamp, 
  boolean
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { geofencesTable } from './geofences';
import { devicesTable } from './devices';

export const usersTable = pgTable('users', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 100 }).unique().notNull(),
  phone: varchar('phone', { length: 20 }),
  //company: varchar('company', { length: 100 }),
  //settings: jsonb('settings').default({}),
  registrationDate: timestamp('registration_date', { withTimezone: true }).defaultNow(),
  //lastLogin: timestamp('last_login', { withTimezone: true }),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const usersRelations = relations(usersTable, ({ many }) => ({
  geofences: many(geofencesTable),
  devices: many(devicesTable),
  //acknowledgedAlerts: many(alertsTable, { relationName: 'acknowledgedBy' }),
  //resolvedAlerts: many(alertsTable, { relationName: 'resolvedBy' }),
}));