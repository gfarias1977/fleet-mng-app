import { integer, pgTable, varchar,  uuid } from 'drizzle-orm/pg-core';
import { statusEnum } from './enums';
import { assetTypesTable } from './asset-types';


export const assetTable = pgTable('assets', {
  id:     integer('ass_id').primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid('ass_uuid').defaultRandom().unique().notNull(),
  assetTypeId:     integer('ast_id').notNull().references(() => assetTypesTable.id, { onDelete: 'restrict' }),
  number:   varchar('ass_number', { length: 150 }).unique().notNull(),
  status: statusEnum('ass_status').notNull().default('active'),
});
