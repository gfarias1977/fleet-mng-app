import { db } from '@/src/db';
import {
  geofenceAlertRulesTable,
  geofencesTable,
  alertTypesTable,
} from '@/src/db/schema';
import { count, ilike, or, asc, desc, and, eq, inArray } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GeofenceAlertRuleRow = {
  id: bigint;
  geofenceId: bigint;
  geofenceName: string;
  alertTypeId: number;
  alertTypeName: string;
  conditionType: string | null;
  thresholdValue: string | null;
  thresholdUnit: string | null;
  cooldownPeriod: number | null;
  minimumDuration: number | null;
  notificationChannels: string[];
  webhookUrl: string | null;
  active: boolean | null;
  priority: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type GeofenceAlertRuleSortField =
  | 'geofenceName'
  | 'alertTypeName'
  | 'conditionType'
  | 'active'
  | 'priority'
  | 'createdAt';

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CreateGeofenceAlertRuleInput = {
  userId: bigint;
  geofenceId: bigint;
  alertTypeId: number;
  conditionType?: string | null;
  thresholdValue?: string | null;
  thresholdUnit?: string | null;
  cooldownPeriod?: number | null;
  minimumDuration?: number | null;
  notificationChannels?: string[];
  webhookUrl?: string | null;
  active?: boolean;
  priority?: number;
};

export type UpdateGeofenceAlertRuleInput = {
  conditionType?: string | null;
  thresholdValue?: string | null;
  thresholdUnit?: string | null;
  cooldownPeriod?: number | null;
  minimumDuration?: number | null;
  notificationChannels?: string[];
  webhookUrl?: string | null;
  active?: boolean;
  priority?: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSortColumn(field: GeofenceAlertRuleSortField) {
  switch (field) {
    case 'geofenceName':
      return geofencesTable.name;
    case 'alertTypeName':
      return alertTypesTable.name;
    case 'conditionType':
      return geofenceAlertRulesTable.conditionType;
    case 'active':
      return geofenceAlertRulesTable.active;
    case 'priority':
      return geofenceAlertRulesTable.priority;
    case 'createdAt':
      return geofenceAlertRulesTable.createdAt;
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getGeofenceAlertRulesPaginated(
  userId: bigint,
  opts: {
    page: number;
    pageSize: number;
    search?: string;
    sortField?: GeofenceAlertRuleSortField;
    sortDir?: 'asc' | 'desc';
  }
): Promise<PaginatedResult<GeofenceAlertRuleRow>> {
  const { page, pageSize, search, sortField = 'createdAt', sortDir = 'desc' } = opts;
  const offset = (page - 1) * pageSize;

  const searchFilter = search
    ? or(
        ilike(geofencesTable.name, `%${search}%`),
        ilike(alertTypesTable.name, `%${search}%`),
        ilike(geofenceAlertRulesTable.conditionType, `%${search}%`)
      )
    : undefined;

  const where = and(eq(geofencesTable.userId, userId), searchFilter);

  const sortColumn = getSortColumn(sortField);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = sortDir === 'desc' ? desc(sortColumn as any) : asc(sortColumn as any);

  const [{ total }] = await db
    .select({ total: count() })
    .from(geofenceAlertRulesTable)
    .innerJoin(geofencesTable, eq(geofenceAlertRulesTable.geofenceId, geofencesTable.id))
    .innerJoin(alertTypesTable, eq(geofenceAlertRulesTable.alertTypeId, alertTypesTable.id))
    .where(where);

  const rows = await db
    .select({
      id: geofenceAlertRulesTable.id,
      geofenceId: geofenceAlertRulesTable.geofenceId,
      geofenceName: geofencesTable.name,
      alertTypeId: geofenceAlertRulesTable.alertTypeId,
      alertTypeName: alertTypesTable.name,
      conditionType: geofenceAlertRulesTable.conditionType,
      thresholdValue: geofenceAlertRulesTable.thresholdValue,
      thresholdUnit: geofenceAlertRulesTable.thresholdUnit,
      cooldownPeriod: geofenceAlertRulesTable.cooldownPeriod,
      minimumDuration: geofenceAlertRulesTable.minimumDuration,
      notificationChannels: geofenceAlertRulesTable.notificationChannels,
      webhookUrl: geofenceAlertRulesTable.webhookUrl,
      active: geofenceAlertRulesTable.active,
      priority: geofenceAlertRulesTable.priority,
      createdAt: geofenceAlertRulesTable.createdAt,
      updatedAt: geofenceAlertRulesTable.updatedAt,
    })
    .from(geofenceAlertRulesTable)
    .innerJoin(geofencesTable, eq(geofenceAlertRulesTable.geofenceId, geofencesTable.id))
    .innerJoin(alertTypesTable, eq(geofenceAlertRulesTable.alertTypeId, alertTypesTable.id))
    .where(where)
    .orderBy(order)
    .limit(pageSize)
    .offset(offset);

  return {
    data: rows.map((r) => ({
      ...r,
      alertTypeId: Number(r.alertTypeId),
      priority: r.priority !== null ? Number(r.priority) : null,
      notificationChannels: Array.isArray(r.notificationChannels)
        ? (r.notificationChannels as string[])
        : ['email'],
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getGeofenceAlertRuleById(
  id: bigint,
  userId: bigint
): Promise<GeofenceAlertRuleRow | null> {
  const [row] = await db
    .select({
      id: geofenceAlertRulesTable.id,
      geofenceId: geofenceAlertRulesTable.geofenceId,
      geofenceName: geofencesTable.name,
      alertTypeId: geofenceAlertRulesTable.alertTypeId,
      alertTypeName: alertTypesTable.name,
      conditionType: geofenceAlertRulesTable.conditionType,
      thresholdValue: geofenceAlertRulesTable.thresholdValue,
      thresholdUnit: geofenceAlertRulesTable.thresholdUnit,
      cooldownPeriod: geofenceAlertRulesTable.cooldownPeriod,
      minimumDuration: geofenceAlertRulesTable.minimumDuration,
      notificationChannels: geofenceAlertRulesTable.notificationChannels,
      webhookUrl: geofenceAlertRulesTable.webhookUrl,
      active: geofenceAlertRulesTable.active,
      priority: geofenceAlertRulesTable.priority,
      createdAt: geofenceAlertRulesTable.createdAt,
      updatedAt: geofenceAlertRulesTable.updatedAt,
    })
    .from(geofenceAlertRulesTable)
    .innerJoin(geofencesTable, eq(geofenceAlertRulesTable.geofenceId, geofencesTable.id))
    .innerJoin(alertTypesTable, eq(geofenceAlertRulesTable.alertTypeId, alertTypesTable.id))
    .where(
      and(
        eq(geofenceAlertRulesTable.id, id),
        eq(geofencesTable.userId, userId)
      )
    )
    .limit(1);

  if (!row) return null;

  return {
    ...row,
    alertTypeId: Number(row.alertTypeId),
    priority: row.priority !== null ? Number(row.priority) : null,
    notificationChannels: Array.isArray(row.notificationChannels)
      ? (row.notificationChannels as string[])
      : ['email'],
  };
}

export async function getAlertTypesForSelect(): Promise<
  { id: number; name: string; category: string | null }[]
> {
  const rows = await db
    .select({
      id: alertTypesTable.id,
      name: alertTypesTable.name,
      category: alertTypesTable.category,
    })
    .from(alertTypesTable)
    .where(eq(alertTypesTable.isActive, true))
    .orderBy(asc(alertTypesTable.category), asc(alertTypesTable.name));

  return rows.map((r) => ({ ...r, id: Number(r.id) }));
}

export async function getGeofencesForSelect(
  userId: bigint
): Promise<{ id: bigint; name: string }[]> {
  return db
    .select({ id: geofencesTable.id, name: geofencesTable.name })
    .from(geofencesTable)
    .where(and(eq(geofencesTable.userId, userId), eq(geofencesTable.active, true)))
    .orderBy(asc(geofencesTable.name));
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createGeofenceAlertRule(
  input: CreateGeofenceAlertRuleInput
): Promise<GeofenceAlertRuleRow> {
  const rows = await db
    .insert(geofenceAlertRulesTable)
    .values({
      geofenceId: input.geofenceId,
      alertTypeId: input.alertTypeId,
      conditionType: input.conditionType ?? null,
      thresholdValue: input.thresholdValue ?? null,
      thresholdUnit: input.thresholdUnit ?? null,
      cooldownPeriod: input.cooldownPeriod ?? null,
      minimumDuration: input.minimumDuration ?? null,
      notificationChannels: input.notificationChannels ?? ['email'],
      webhookUrl: input.webhookUrl ?? null,
      active: input.active ?? true,
      priority: input.priority ?? 1,
    })
    .returning();

  const result = await getGeofenceAlertRuleById(rows[0].id, input.userId);
  if (!result) throw new Error('Failed to fetch created geofence alert rule');
  return result;
}

export async function updateGeofenceAlertRule(
  id: bigint,
  userId: bigint,
  input: UpdateGeofenceAlertRuleInput
): Promise<GeofenceAlertRuleRow> {
  // Scope update to the user's geofences via subquery
  const userGeofenceIds = db
    .select({ id: geofencesTable.id })
    .from(geofencesTable)
    .where(eq(geofencesTable.userId, userId));

  await db
    .update(geofenceAlertRulesTable)
    .set({
      ...(input.conditionType !== undefined && { conditionType: input.conditionType }),
      ...(input.thresholdValue !== undefined && { thresholdValue: input.thresholdValue }),
      ...(input.thresholdUnit !== undefined && { thresholdUnit: input.thresholdUnit }),
      ...(input.cooldownPeriod !== undefined && { cooldownPeriod: input.cooldownPeriod }),
      ...(input.minimumDuration !== undefined && { minimumDuration: input.minimumDuration }),
      ...(input.notificationChannels !== undefined && {
        notificationChannels: input.notificationChannels,
      }),
      ...(input.webhookUrl !== undefined && { webhookUrl: input.webhookUrl }),
      ...(input.active !== undefined && { active: input.active }),
      ...(input.priority !== undefined && { priority: input.priority }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(geofenceAlertRulesTable.id, id),
        inArray(geofenceAlertRulesTable.geofenceId, userGeofenceIds)
      )
    );

  const row = await getGeofenceAlertRuleById(id, userId);
  if (!row) throw new Error('Failed to fetch updated geofence alert rule');
  return row;
}

export async function deleteGeofenceAlertRule(id: bigint, userId: bigint): Promise<void> {
  const userGeofenceIds = db
    .select({ id: geofencesTable.id })
    .from(geofencesTable)
    .where(eq(geofencesTable.userId, userId));

  await db
    .delete(geofenceAlertRulesTable)
    .where(
      and(
        eq(geofenceAlertRulesTable.id, id),
        inArray(geofenceAlertRulesTable.geofenceId, userGeofenceIds)
      )
    );
}
