import { integer, pgTable, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { statusEnum } from './enums';
import { sensorTypesTable } from './sensor-types';


export const sensorTable = pgTable('sensors', {
  id:     integer('sns_id').primaryKey().generatedAlwaysAsIdentity(),
  stId:     integer('sns_st_id').notNull().references(() => sensorTypesTable.id, { onDelete: 'restrict' }),
  name:   varchar('sns_name', { length: 150 }).notNull(),
  model:  varchar('sns_model', { length: 50 }),
  brand:  varchar('sns_brand', { length: 50 }),
  status: statusEnum('sns_status').notNull().default('active'),
});

export const sensorsRelations = relations(sensorTable, ({ one }) => ({
  sensorType: one(sensorTypesTable, { fields: [sensorTable.stId], references: [sensorTypesTable.id] }),
}));
