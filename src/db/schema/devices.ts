// db/schema/devices.ts
import { 
  pgTable,
  bigserial,
  varchar,
  timestamp,
  boolean, 
  bigint,
  smallint,
  index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { usersTable } from './users';
import { deviceTypesTable } from './device-types';
import { deviceSensorsTable } from './device-sensors';
import { assetGeofenceAssignmentsTable } from './asset-geofence-assignments';
import { assetTable } from './assets';
import { telemetryEventsTable } from './telemetry_events';
import { alertsTable } from './alerts';
import { deviceLocationHistoryTable } from './device-location-history';

export const devicesTable = pgTable('devices', {
  id: bigserial('dev_id', { mode: 'bigint' }).primaryKey(),
  serialNumber: varchar('serial_number', { length: 100 }).unique().notNull(),
  userId: bigint('dev_user_id', { mode: 'bigint' }).references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  deviceTypeId: smallint('dev_dvt_id').references(() => deviceTypesTable.id).notNull(),
  assetId: bigint('dev_ass_id', { mode: 'bigint' }).references(() => assetTable.id, { onDelete: 'set null' }),

  // Identification
  //uniqueIdentifier: varchar('dev_unique_identifier', { length: 100 }).unique().notNull(),
  name: varchar('dev_name', { length: 100 }).notNull(),
  model: varchar('dev_model', { length: 50 }),
  brand: varchar('dev_brand', { length: 50 }),

  // Network
  gateway: varchar('dev_gateway', { length: 100 }),
  gatewayMacAddress: varchar('dev_gateway_mac_address', { length: 17 }),
  macAddress: varchar('dev_mac_address', { length: 17 }),
  //manufacturer: varchar('dev_manufacturer', { length: 50 }),
  //firmwareVersion: varchar('dev_firmware_version', { length: 20 }),
  
  // Device status
  status: varchar('dev_status', { length: 20 }).default('offline'),
  //lastConnection: timestamp('dev_last_connection', { withTimezone: true }),
  //lastIpAddress: inet('dev_last_ip_address'),
  //batteryLevel: smallint('dev_battery_level'),
  
  // Device configuration
  //configuration: jsonb('dev_configuration').default({}),
  //metadata: jsonb('dev_metadata').default({}),
  
  // Tracking
  active: boolean('dev_active').default(true),
  registrationDate: timestamp('dev_registration_date', { withTimezone: true }).defaultNow(),
  deactivationDate: timestamp('dev_deactivation_date', { withTimezone: true }),
  
  createdAt: timestamp('dev_created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('dev_updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  // Indexes
  userStatusIdx: index('idx_devices_user_status').on(table.userId, table.status, table.active),
  //lastConnectionIdx: index('idx_devices_last_connection').on(table.lastConnection),
  //identifierIdx: index('idx_devices_identifier').on(table.uniqueIdentifier),
  //configGinIdx: index('idx_devices_config_gin').using('gin', table.configuration),
  
  // Check constraint
  //batteryLevelCheck: check('battery_level_check', sql`${table.batteryLevel} BETWEEN 0 AND 100`),
}));

export const devicesRelations = relations(devicesTable, ({ one, many }) => ({
  user: one(usersTable, { fields: [devicesTable.userId], references: [usersTable.id] }),
  deviceType: one(deviceTypesTable, { fields: [devicesTable.deviceTypeId], references: [deviceTypesTable.id] }),
  asset: one(assetTable, { fields: [devicesTable.assetId], references: [assetTable.id] }),
  sensors: many(deviceSensorsTable),
  assignments: many(assetGeofenceAssignmentsTable),
  trackingEvents: many(telemetryEventsTable),
  alerts: many(alertsTable),
  locationHistory: many(deviceLocationHistoryTable),
}));