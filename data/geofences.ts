import { db } from '@/src/db';
import {
  geofencesTable,
  geofenceTypesTable,
  assetGeofenceAssignmentsTable,
  assetTable,
  devicesTable,
  telemetryEventsTable,
} from '@/src/db/schema';
import { count, ilike, or, asc, desc, and, eq, inArray, sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GeofenceRow = {
  id: bigint;
  uuid: string;
  name: string;
  description: string | null;
  geofenceTypeId: number;
  typeName: string;
  centerLatitude: string | null;
  centerLongitude: string | null;
  radiusMeters: string | null;
  active: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type GeofenceSortField =
  | 'name'
  | 'description'
  | 'typeName'
  | 'centerLatitude'
  | 'centerLongitude'
  | 'radiusMeters'
  | 'active'
  | 'createdAt'
  | 'updatedAt';

export type CreateGeofenceInput = {
  userId: bigint;
  name: string;
  description?: string | null;
  geofenceTypeId: number;
  centerLatitude?: string | null;
  centerLongitude?: string | null;
  radiusMeters?: string | null;
  active?: boolean;
};

export type UpdateGeofenceInput = {
  name?: string;
  description?: string | null;
  geofenceTypeId?: number;
  centerLatitude?: string | null;
  centerLongitude?: string | null;
  radiusMeters?: string | null;
  active?: boolean;
};

export type GeofenceMapData = {
  geofence: {
    name: string;
    centerLatitude: string;
    centerLongitude: string;
    radiusMeters: string;
  };
  assets: Array<{
    id: number;
    number: string;
    lastLat: string;
    lastLng: string;
    lastTimestamp: Date;
  }>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSortColumn(field: GeofenceSortField) {
  switch (field) {
    case 'name':
      return geofencesTable.name;
    case 'description':
      return geofencesTable.description;
    case 'typeName':
      return geofenceTypesTable.name;
    case 'centerLatitude':
      return geofencesTable.centerLatitude;
    case 'centerLongitude':
      return geofencesTable.centerLongitude;
    case 'radiusMeters':
      return geofencesTable.radiusMeters;
    case 'active':
      return geofencesTable.active;
    case 'createdAt':
      return geofencesTable.createdAt;
    case 'updatedAt':
      return geofencesTable.updatedAt;
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getGeofencesPaginated(
  userId: bigint,
  opts: {
    page: number;
    pageSize: number;
    search?: string;
    sortField?: GeofenceSortField;
    sortDir?: 'asc' | 'desc';
  }
): Promise<PaginatedResult<GeofenceRow>> {
  const { page, pageSize, search, sortField = 'name', sortDir = 'asc' } = opts;
  const offset = (page - 1) * pageSize;

  const searchFilter =
    search
      ? or(
          ilike(geofencesTable.name, `%${search}%`),
          ilike(geofencesTable.description, `%${search}%`)
        )
      : undefined;

  const where = and(eq(geofencesTable.userId, userId), searchFilter);

  const sortColumn = getSortColumn(sortField);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = sortDir === 'desc' ? desc(sortColumn as any) : asc(sortColumn as any);

  const [{ total }] = await db
    .select({ total: count() })
    .from(geofencesTable)
    .leftJoin(geofenceTypesTable, eq(geofencesTable.geofenceTypeId, geofenceTypesTable.id))
    .where(where);

  const rows = await db
    .select({
      id: geofencesTable.id,
      uuid: geofencesTable.uuid,
      name: geofencesTable.name,
      description: geofencesTable.description,
      geofenceTypeId: geofencesTable.geofenceTypeId,
      typeName: sql<string>`coalesce(${geofenceTypesTable.name}, '')`,
      centerLatitude: geofencesTable.centerLatitude,
      centerLongitude: geofencesTable.centerLongitude,
      radiusMeters: geofencesTable.radiusMeters,
      active: geofencesTable.active,
      createdAt: geofencesTable.createdAt,
      updatedAt: geofencesTable.updatedAt,
    })
    .from(geofencesTable)
    .leftJoin(geofenceTypesTable, eq(geofencesTable.geofenceTypeId, geofenceTypesTable.id))
    .where(where)
    .orderBy(order)
    .limit(pageSize)
    .offset(offset);

  return {
    data: rows as GeofenceRow[],
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getGeofenceById(
  id: bigint,
  userId: bigint
): Promise<GeofenceRow | null> {
  const [row] = await db
    .select({
      id: geofencesTable.id,
      uuid: geofencesTable.uuid,
      name: geofencesTable.name,
      description: geofencesTable.description,
      geofenceTypeId: geofencesTable.geofenceTypeId,
      typeName: sql<string>`coalesce(${geofenceTypesTable.name}, '')`,
      centerLatitude: geofencesTable.centerLatitude,
      centerLongitude: geofencesTable.centerLongitude,
      radiusMeters: geofencesTable.radiusMeters,
      active: geofencesTable.active,
      createdAt: geofencesTable.createdAt,
      updatedAt: geofencesTable.updatedAt,
    })
    .from(geofencesTable)
    .leftJoin(geofenceTypesTable, eq(geofencesTable.geofenceTypeId, geofenceTypesTable.id))
    .where(and(eq(geofencesTable.id, id), eq(geofencesTable.userId, userId)))
    .limit(1);

  return (row as GeofenceRow) ?? null;
}

export async function getGeofenceTypes(): Promise<{ id: number; name: string }[]> {
  return db
    .select({ id: geofenceTypesTable.id, name: geofenceTypesTable.name })
    .from(geofenceTypesTable)
    .where(eq(geofenceTypesTable.isActive, true));
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createGeofence(input: CreateGeofenceInput): Promise<GeofenceRow> {
  const [inserted] = await db
    .insert(geofencesTable)
    .values({
      userId: input.userId,
      name: input.name,
      description: input.description ?? null,
      geofenceTypeId: input.geofenceTypeId,
      centerLatitude: input.centerLatitude ?? null,
      centerLongitude: input.centerLongitude ?? null,
      radiusMeters: input.radiusMeters ?? null,
      active: input.active ?? true,
    })
    .returning();

  const result = await getGeofenceById(inserted.id, input.userId);
  if (!result) throw new Error('Failed to fetch created geofence');
  return result;
}

export async function updateGeofence(
  id: bigint,
  userId: bigint,
  input: UpdateGeofenceInput
): Promise<GeofenceRow> {
  await db
    .update(geofencesTable)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.geofenceTypeId !== undefined && { geofenceTypeId: input.geofenceTypeId }),
      ...(input.centerLatitude !== undefined && { centerLatitude: input.centerLatitude }),
      ...(input.centerLongitude !== undefined && { centerLongitude: input.centerLongitude }),
      ...(input.radiusMeters !== undefined && { radiusMeters: input.radiusMeters }),
      ...(input.active !== undefined && { active: input.active }),
      updatedAt: new Date(),
    })
    .where(and(eq(geofencesTable.id, id), eq(geofencesTable.userId, userId)));

  const result = await getGeofenceById(id, userId);
  if (!result) throw new Error('Failed to fetch updated geofence');
  return result;
}

export async function deleteGeofence(id: bigint, userId: bigint): Promise<void> {
  await db
    .delete(geofencesTable)
    .where(and(eq(geofencesTable.id, id), eq(geofencesTable.userId, userId)));
}

// ---------------------------------------------------------------------------
// Map data
// ---------------------------------------------------------------------------

export async function getGeofenceMapData(
  id: bigint,
  userId: bigint
): Promise<GeofenceMapData | null> {
  // 1. Fetch the geofence
  const [geofence] = await db
    .select({
      name: geofencesTable.name,
      centerLatitude: geofencesTable.centerLatitude,
      centerLongitude: geofencesTable.centerLongitude,
      radiusMeters: geofencesTable.radiusMeters,
    })
    .from(geofencesTable)
    .where(and(eq(geofencesTable.id, id), eq(geofencesTable.userId, userId)))
    .limit(1);

  if (
    !geofence ||
    !geofence.centerLatitude ||
    !geofence.centerLongitude ||
    !geofence.radiusMeters
  ) {
    return null;
  }

  // 2. Get active assignments (assetIds as bigint)
  const assignments = await db
    .select({ assetId: assetGeofenceAssignmentsTable.assetId })
    .from(assetGeofenceAssignmentsTable)
    .where(
      and(
        eq(assetGeofenceAssignmentsTable.geofenceId, id),
        eq(assetGeofenceAssignmentsTable.isActive, true)
      )
    );

  if (assignments.length === 0) {
    return {
      geofence: {
        name: geofence.name,
        centerLatitude: geofence.centerLatitude,
        centerLongitude: geofence.centerLongitude,
        radiusMeters: geofence.radiusMeters,
      },
      assets: [],
    };
  }

  // 3. Fetch assets by integer IDs (assetTable.id is integer)
  const assetIntIds = assignments.map((a) => Number(a.assetId));
  const assets = await db
    .select({ id: assetTable.id, number: assetTable.number })
    .from(assetTable)
    .where(inArray(assetTable.id, assetIntIds));

  if (assets.length === 0) {
    return {
      geofence: {
        name: geofence.name,
        centerLatitude: geofence.centerLatitude,
        centerLongitude: geofence.centerLongitude,
        radiusMeters: geofence.radiusMeters,
      },
      assets: [],
    };
  }

  // 4. Get devices per asset (devicesTable.assetId is bigint, assetTable.id is integer)
  const assetBigIntIds = assetIntIds.map((n) => BigInt(n));
  const devices = await db
    .select({ id: devicesTable.id, assetId: devicesTable.assetId })
    .from(devicesTable)
    .where(inArray(devicesTable.assetId, assetBigIntIds));

  if (devices.length === 0) {
    return {
      geofence: {
        name: geofence.name,
        centerLatitude: geofence.centerLatitude,
        centerLongitude: geofence.centerLongitude,
        radiusMeters: geofence.radiusMeters,
      },
      assets: [],
    };
  }

  // 5. Get latest telemetry per device
  const deviceIds = devices.map((d) => d.id);
  const telemetryRows = await db
    .select({
      deviceId: telemetryEventsTable.deviceId,
      latitude: telemetryEventsTable.latitude,
      longitude: telemetryEventsTable.longitude,
      eventTimestamp: telemetryEventsTable.eventTimestamp,
    })
    .from(telemetryEventsTable)
    .where(inArray(telemetryEventsTable.deviceId, deviceIds))
    .orderBy(desc(telemetryEventsTable.eventTimestamp));

  // Keep only the latest event per device
  const latestByDevice = new Map<string, typeof telemetryRows[0]>();
  for (const row of telemetryRows) {
    const key = String(row.deviceId);
    if (!latestByDevice.has(key)) {
      latestByDevice.set(key, row);
    }
  }

  // 6. Build assets list with last positions
  const assetMap = new Map(assets.map((a) => [a.id, a]));
  const devicesByAsset = new Map<number, bigint>();
  for (const device of devices) {
    if (device.assetId !== null) {
      devicesByAsset.set(Number(device.assetId), device.id);
    }
  }

  const assetsWithPositions: GeofenceMapData['assets'] = [];
  for (const asset of assets) {
    const deviceId = devicesByAsset.get(asset.id);
    if (!deviceId) continue;
    const latest = latestByDevice.get(String(deviceId));
    if (!latest) continue;
    assetsWithPositions.push({
      id: assetMap.get(asset.id)!.id,
      number: asset.number,
      lastLat: latest.latitude,
      lastLng: latest.longitude,
      lastTimestamp: latest.eventTimestamp,
    });
  }

  return {
    geofence: {
      name: geofence.name,
      centerLatitude: geofence.centerLatitude,
      centerLongitude: geofence.centerLongitude,
      radiusMeters: geofence.radiusMeters,
    },
    assets: assetsWithPositions,
  };
}
