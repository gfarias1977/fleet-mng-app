# Database Coding Standards

## Overview

This project uses **Drizzle ORM** exclusively for all database access. Raw SQL is never permitted.

---

## ORM rules

- Use Drizzle ORM for every query (select, insert, update, delete).
- Never use `db.execute(sql`...`)` or any raw SQL escape hatch.
- Query logic belongs in `src/data/` helper functions — never inline in Server Actions or components.

```ts
// ✅ Correct — Drizzle ORM
const devices = await db
  .select()
  .from(devicesTable)
  .where(eq(devicesTable.dev_user_id, userId));

// ❌ Wrong — raw SQL
await db.execute(sql`SELECT * FROM devices WHERE dev_user_id = ${userId}`);
```

---

## Schema files

All table definitions live in `src/db/schema/`, with one file per domain entity. Every schema file must be re-exported from `src/db/schema/index.ts`.

```
src/
  db/
    schema/
      devices.ts
      geofences.ts
      alerts.ts
      ...
      index.ts      ← re-exports all tables
    index.ts        ← exports `db` client
```

---

## Column naming convention

Each table uses a **3-letter prefix** for all its columns. This prevents ambiguity in joins and makes it clear which table a column belongs to.

| Table | Prefix |
|-------|--------|
| `users` | _(no prefix)_ |
| `devices` | `dev_` |
| `geofences` | `geo_` |
| `alerts` | `alr_` |
| `geofence_alert_rules` | `gar_` |
| `device_geofence_assignments` | `dvg_` |
| `tracking_events` | `tev_` |
| `device_location_history` | `dvl_` |
| `device_sensors` | `dvs_` |
| `sensor_types` | `snt_` |
| `asset_types` | `ast_` |

```ts
// ✅ Correct — column names use table prefix
export const devicesTable = pgTable('devices', {
  dev_id: bigserial('dev_id', { mode: 'bigint' }).primaryKey(),
  dev_user_id: bigint('dev_user_id', { mode: 'bigint' }).notNull(),
  dev_name: varchar('dev_name', { length: 100 }).notNull(),
  dev_created_at: timestamp('dev_created_at').defaultNow().notNull(),
});

// ❌ Wrong — no prefix
export const devicesTable = pgTable('devices', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
});
```

---

## Migration workflow

### Local development

Use `db:push` to apply schema changes directly without generating a migration file:

```bash
npm run db:push
```

This is the standard workflow during active development. It does not create files under `drizzle/`.

### Production

Generate a SQL migration file, review it, then run it:

```bash
npm run db:generate   # generates SQL in drizzle/
# → review the generated SQL file before continuing
npm run db:migrate    # applies the migration to the target DB
```

Never run `db:push` against the production database.

### Other commands

```bash
npm run db:studio   # open Drizzle Studio to browse/edit data
npm run db:seed     # run the seed script
```

---

## Database selection

The active database is controlled by `USE_LOCAL_DB` in `.env.local`:

| `USE_LOCAL_DB` | Database used |
|----------------|---------------|
| `true` | `LOCAL_DATABASE_URL` (local Postgres) |
| `false` or absent | `DATABASE_URL` (Neon serverless) |

The selection logic lives in `src/db/index.ts`. Do not bypass it by importing a connection directly.

---

## Drizzle config

`drizzle.config.ts` at the project root defines:

- Schema path: `./src/db/schema/index.ts`
- Migrations output: `./drizzle/`
- Driver: `pg` (Neon serverless)

Do not modify `drizzle.config.ts` without understanding the impact on the migration workflow.

---

## Checklist

Before writing any database code, verify:

- [ ] All DB writes go through a `src/data/` helper — not inline in actions or components
- [ ] Drizzle ORM is used for every query — no raw SQL
- [ ] New table columns follow the 3-letter prefix convention for that table
- [ ] New schema files are exported from `src/db/schema/index.ts`
- [ ] Local schema changes are applied with `npm run db:push`
- [ ] Production migrations use `db:generate` → review SQL → `db:migrate`
- [ ] Every mutation helper scopes queries to the authenticated `userId` (see `docs/data-mutations.md`)
