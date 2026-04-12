import { db } from '@/src/db';
import { alertTypesTable } from '@/src/db/schema';
import { count, ilike, or, asc, desc, eq } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AlertType = {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  priority: number | null;
  requiresAcknowledgment: boolean | null;
  defaultMessage: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
};

export type AlertTypeSortField =
  | 'name'
  | 'category'
  | 'description'
  | 'priority'
  | 'requiresAcknowledgment'
  | 'isActive'
  | 'createdAt';

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CreateAlertTypeInput = {
  name: string;
  category?: string | null;
  description?: string | null;
  priority?: number | null;
  requiresAcknowledgment?: boolean;
  defaultMessage?: string | null;
  isActive?: boolean;
};

export type UpdateAlertTypeInput = {
  name?: string;
  category?: string | null;
  description?: string | null;
  priority?: number | null;
  requiresAcknowledgment?: boolean;
  defaultMessage?: string | null;
  isActive?: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSortColumn(field: AlertTypeSortField) {
  switch (field) {
    case 'name':
      return alertTypesTable.name;
    case 'category':
      return alertTypesTable.category;
    case 'description':
      return alertTypesTable.description;
    case 'priority':
      return alertTypesTable.priority;
    case 'requiresAcknowledgment':
      return alertTypesTable.requiresAcknowledgment;
    case 'isActive':
      return alertTypesTable.isActive;
    case 'createdAt':
      return alertTypesTable.createdAt;
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getAlertTypesPaginated(opts: {
  page: number;
  pageSize: number;
  search?: string;
  sortField?: AlertTypeSortField;
  sortDir?: 'asc' | 'desc';
}): Promise<PaginatedResult<AlertType>> {
  const { page, pageSize, search, sortField = 'name', sortDir = 'asc' } = opts;
  const offset = (page - 1) * pageSize;

  const searchFilter = search
    ? or(
        ilike(alertTypesTable.name, `%${search}%`),
        ilike(alertTypesTable.category, `%${search}%`),
        ilike(alertTypesTable.description, `%${search}%`),
        ilike(alertTypesTable.defaultMessage, `%${search}%`)
      )
    : undefined;

  const sortColumn = getSortColumn(sortField);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = sortDir === 'desc' ? desc(sortColumn as any) : asc(sortColumn as any);

  const [{ total }] = await db
    .select({ total: count() })
    .from(alertTypesTable)
    .where(searchFilter);

  const rows = await db
    .select()
    .from(alertTypesTable)
    .where(searchFilter)
    .orderBy(order)
    .limit(pageSize)
    .offset(offset);

  return {
    data: rows as AlertType[],
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAlertTypeById(id: number): Promise<AlertType | null> {
  const [row] = await db
    .select()
    .from(alertTypesTable)
    .where(eq(alertTypesTable.id, id))
    .limit(1);
  return (row as AlertType) ?? null;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createAlertType(input: CreateAlertTypeInput): Promise<AlertType> {
  const [row] = await db
    .insert(alertTypesTable)
    .values({
      name: input.name,
      category: input.category ?? null,
      description: input.description ?? null,
      priority: input.priority ?? 1,
      requiresAcknowledgment: input.requiresAcknowledgment ?? false,
      defaultMessage: input.defaultMessage ?? null,
      isActive: input.isActive ?? true,
    })
    .returning();
  return row as AlertType;
}

export async function updateAlertType(
  id: number,
  input: UpdateAlertTypeInput
): Promise<AlertType> {
  const [row] = await db
    .update(alertTypesTable)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.requiresAcknowledgment !== undefined && {
        requiresAcknowledgment: input.requiresAcknowledgment,
      }),
      ...(input.defaultMessage !== undefined && { defaultMessage: input.defaultMessage }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    })
    .where(eq(alertTypesTable.id, id))
    .returning();
  return row as AlertType;
}

export async function deleteAlertType(id: number): Promise<void> {
  await db.delete(alertTypesTable).where(eq(alertTypesTable.id, id));
}
