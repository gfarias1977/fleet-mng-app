import { integer, pgTable, varchar } from 'drizzle-orm/pg-core';
import { statusEnum } from './enums';


export const assetTypesTable = pgTable('asset_types', {
  id:     integer('ast_id').primaryKey().generatedAlwaysAsIdentity(),
  name:   varchar('ast_name', { length: 100 }).notNull(),
  status: statusEnum('ast_status').notNull().default('active'),
});
