import { db } from '@/src/db';
import {
  geofencesTable,
  geofenceTypesTable,
  assetGeofenceAssignmentsTable,
  assetTable,
  devicesTable,
  telemetryEventsTable,
  geofencePolygonPointsTable,
  geofenceRectanglesTable,
  deviceSensorsTable,
  sensorTable,
  sensorTypesTable,
} from '@/src/db/schema';
import { count, ilike, or, asc, desc, and, eq, inArray, sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GeofenceGeometry =
  | { type: 'circular'; centerLatitude: string; centerLongitude: string; radiusMeters: string }
  | { type: 'polygon'; points: { latitude: string; longitude: string; pointOrder: number }[] }
  | { type: 'rectangular'; nwLatitude: string; nwLongitude: string; seLatitude: string; seLongitude: string }
  | null;

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
  geometrySummary: string;
};

export type GeofenceWithGeometry = GeofenceRow & { geometry: GeofenceGeometry };

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
  | 'active'
  | 'createdAt'
  | 'updatedAt';

export type CreateGeofenceInput = {
  userId: bigint;
  name: string;
  description?: string | null;
  geofenceTypeId: number;
  active?: boolean;
  geometry: GeofenceGeometry;
};

export type UpdateGeofenceInput = {
  name?: string;
  description?: string | null;
  geofenceTypeId?: number;
  active?: boolean;
  geometry?: GeofenceGeometry;
};

export type GeofenceMapData = {
  geofence: {
    name: string;
    geofenceTypeId: number;
    geometry: GeofenceGeometry;
  };
  assets: Array<{
    id: number;
    number: string;
    lastLat: string;
    lastLng: string;
    lastTimestamp: Date;
    deviceId: bigint;
    deviceName: string;
    deviceSerialNumber: string;
    sensors: { name: string; sensorTypeName: string }[];
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
      geometrySummary: sql<string>`(CASE
        WHEN lower(${geofenceTypesTable.name}) = 'circular'
          THEN 'r=' || ROUND(COALESCE(${geofencesTable.radiusMeters}::numeric, 0)) || 'm'
        WHEN lower(${geofenceTypesTable.name}) = 'polygon'
          THEN (SELECT COUNT(*)::text || ' pts' FROM geofence_polygon_points WHERE gpp_geo_id = ${geofencesTable.id})
        WHEN lower(${geofenceTypesTable.name}) = 'rectangular'
          THEN 'NW/SE'
        ELSE ''
      END)`,
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
      geometrySummary: sql<string>`(CASE
        WHEN lower(${geofenceTypesTable.name}) = 'circular'
          THEN 'r=' || ROUND(COALESCE(${geofencesTable.radiusMeters}::numeric, 0)) || 'm'
        WHEN lower(${geofenceTypesTable.name}) = 'polygon'
          THEN (SELECT COUNT(*)::text || ' pts' FROM geofence_polygon_points WHERE gpp_geo_id = ${geofencesTable.id})
        WHEN lower(${geofenceTypesTable.name}) = 'rectangular'
          THEN 'NW/SE'
        ELSE ''
      END)`,
    })
    .from(geofencesTable)
    .leftJoin(geofenceTypesTable, eq(geofencesTable.geofenceTypeId, geofenceTypesTable.id))
    .where(and(eq(geofencesTable.id, id), eq(geofencesTable.userId, userId)))
    .limit(1);

  return (row as GeofenceRow) ?? null;
}

export async function getGeofenceWithGeometry(
  id: bigint,
  userId: bigint
): Promise<GeofenceWithGeometry | null> {
  const row = await getGeofenceById(id, userId);
  if (!row) return null;

  let geometry: GeofenceGeometry = null;
  const typeName = row.typeName.toLowerCase();

  if (typeName === 'circular') {
    if (row.centerLatitude && row.centerLongitude && row.radiusMeters) {
      geometry = {
        type: 'circular',
        centerLatitude: row.centerLatitude,
        centerLongitude: row.centerLongitude,
        radiusMeters: row.radiusMeters,
      };
    }
  } else if (typeName === 'polygon') {
    const points = await db
      .select({
        latitude: geofencePolygonPointsTable.latitude,
        longitude: geofencePolygonPointsTable.longitude,
        pointOrder: geofencePolygonPointsTable.pointOrder,
      })
      .from(geofencePolygonPointsTable)
      .where(eq(geofencePolygonPointsTable.geofenceId, id))
      .orderBy(asc(geofencePolygonPointsTable.pointOrder));

    geometry = { type: 'polygon', points };
  } else if (typeName === 'rectangular') {
    const [rect] = await db
      .select({
        nwLatitude: geofenceRectanglesTable.nwLatitude,
        nwLongitude: geofenceRectanglesTable.nwLongitude,
        seLatitude: geofenceRectanglesTable.seLatitude,
        seLongitude: geofenceRectanglesTable.seLongitude,
      })
      .from(geofenceRectanglesTable)
      .where(eq(geofenceRectanglesTable.geofenceId, id))
      .limit(1);

    if (rect) {
      geometry = {
        type: 'rectangular',
        nwLatitude: rect.nwLatitude,
        nwLongitude: rect.nwLongitude,
        seLatitude: rect.seLatitude,
        seLongitude: rect.seLongitude,
      };
    }
  }

  return { ...row, geometry };
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
  const result = await db.transaction(async (tx) => {
    const circularData =
      input.geometry?.type === 'circular' ? input.geometry : null;

    const [inserted] = await tx
      .insert(geofencesTable)
      .values({
        userId: input.userId,
        name: input.name,
        description: input.description ?? null,
        geofenceTypeId: input.geofenceTypeId,
        centerLatitude: circularData?.centerLatitude ?? null,
        centerLongitude: circularData?.centerLongitude ?? null,
        radiusMeters: circularData?.radiusMeters ?? null,
        active: input.active ?? true,
      })
      .returning();

    const geoId = inserted.id;

    if (input.geometry?.type === 'polygon' && input.geometry.points.length >= 3) {
      await tx.insert(geofencePolygonPointsTable).values(
        input.geometry.points.map((p) => ({
          geofenceId: geoId,
          pointOrder: p.pointOrder,
          latitude: p.latitude,
          longitude: p.longitude,
        }))
      );
    } else if (input.geometry?.type === 'rectangular') {
      const g = input.geometry;
      await tx.insert(geofenceRectanglesTable).values({
        geofenceId: geoId,
        nwLatitude: g.nwLatitude,
        nwLongitude: g.nwLongitude,
        seLatitude: g.seLatitude,
        seLongitude: g.seLongitude,
      });
    }

    return geoId;
  });

  const row = await getGeofenceById(result, input.userId);
  if (!row) throw new Error('Failed to fetch created geofence');
  return row;
}

export async function updateGeofence(
  id: bigint,
  userId: bigint,
  input: UpdateGeofenceInput
): Promise<GeofenceRow> {
  await db.transaction(async (tx) => {
    const circularData =
      input.geometry?.type === 'circular' ? input.geometry : null;

    await tx
      .update(geofencesTable)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.geofenceTypeId !== undefined && { geofenceTypeId: input.geofenceTypeId }),
        ...(input.active !== undefined && { active: input.active }),
        ...(input.geometry !== undefined && {
          centerLatitude: circularData?.centerLatitude ?? null,
          centerLongitude: circularData?.centerLongitude ?? null,
          radiusMeters: circularData?.radiusMeters ?? null,
        }),
        updatedAt: new Date(),
      })
      .where(and(eq(geofencesTable.id, id), eq(geofencesTable.userId, userId)));

    if (input.geometry !== undefined) {
      // Remove old geometry data
      await tx
        .delete(geofencePolygonPointsTable)
        .where(eq(geofencePolygonPointsTable.geofenceId, id));
      await tx
        .delete(geofenceRectanglesTable)
        .where(eq(geofenceRectanglesTable.geofenceId, id));

      // Insert new geometry data
      if (input.geometry?.type === 'polygon' && input.geometry.points.length >= 3) {
        await tx.insert(geofencePolygonPointsTable).values(
          input.geometry.points.map((p) => ({
            geofenceId: id,
            pointOrder: p.pointOrder,
            latitude: p.latitude,
            longitude: p.longitude,
          }))
        );
      } else if (input.geometry?.type === 'rectangular') {
        const g = input.geometry;
        await tx.insert(geofenceRectanglesTable).values({
          geofenceId: id,
          nwLatitude: g.nwLatitude,
          nwLongitude: g.nwLongitude,
          seLatitude: g.seLatitude,
          seLongitude: g.seLongitude,
        });
      }
    }
  });

  const row = await getGeofenceById(id, userId);
  if (!row) throw new Error('Failed to fetch updated geofence');
  return row;
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
  // 1. Fetch the geofence with type name
  const [geofence] = await db
    .select({
      name: geofencesTable.name,
      geofenceTypeId: geofencesTable.geofenceTypeId,
      typeName: sql<string>`coalesce(${geofenceTypesTable.name}, '')`,
      centerLatitude: geofencesTable.centerLatitude,
      centerLongitude: geofencesTable.centerLongitude,
      radiusMeters: geofencesTable.radiusMeters,
    })
    .from(geofencesTable)
    .leftJoin(geofenceTypesTable, eq(geofencesTable.geofenceTypeId, geofenceTypesTable.id))
    .where(and(eq(geofencesTable.id, id), eq(geofencesTable.userId, userId)))
    .limit(1);

  if (!geofence) return null;

  // 2. Resolve geometry by type name
  let geometry: GeofenceGeometry = null;
  const typeName = geofence.typeName.toLowerCase();

  if (typeName === 'circular') {
    if (geofence.centerLatitude && geofence.centerLongitude && geofence.radiusMeters) {
      geometry = {
        type: 'circular',
        centerLatitude: geofence.centerLatitude,
        centerLongitude: geofence.centerLongitude,
        radiusMeters: geofence.radiusMeters,
      };
    }
  } else if (typeName === 'polygon') {
    const points = await db
      .select({
        latitude: geofencePolygonPointsTable.latitude,
        longitude: geofencePolygonPointsTable.longitude,
        pointOrder: geofencePolygonPointsTable.pointOrder,
      })
      .from(geofencePolygonPointsTable)
      .where(eq(geofencePolygonPointsTable.geofenceId, id))
      .orderBy(asc(geofencePolygonPointsTable.pointOrder));

    if (points.length > 0) {
      geometry = { type: 'polygon', points };
    }
  } else if (typeName === 'rectangular') {
    const [rect] = await db
      .select({
        nwLatitude: geofenceRectanglesTable.nwLatitude,
        nwLongitude: geofenceRectanglesTable.nwLongitude,
        seLatitude: geofenceRectanglesTable.seLatitude,
        seLongitude: geofenceRectanglesTable.seLongitude,
      })
      .from(geofenceRectanglesTable)
      .where(eq(geofenceRectanglesTable.geofenceId, id))
      .limit(1);

    if (rect) {
      geometry = {
        type: 'rectangular',
        nwLatitude: rect.nwLatitude,
        nwLongitude: rect.nwLongitude,
        seLatitude: rect.seLatitude,
        seLongitude: rect.seLongitude,
      };
    }
  }

  if (!geometry) return null;

  // 3. Get active assignments
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
    return { geofence: { name: geofence.name, geofenceTypeId: geofence.geofenceTypeId, geometry }, assets: [] };
  }

  // 4. Fetch assets
  const assetIntIds = assignments.map((a) => Number(a.assetId));
  const assets = await db
    .select({ id: assetTable.id, number: assetTable.number })
    .from(assetTable)
    .where(inArray(assetTable.id, assetIntIds));

  if (assets.length === 0) {
    return { geofence: { name: geofence.name, geofenceTypeId: geofence.geofenceTypeId, geometry }, assets: [] };
  }

  // 5. Get devices per asset
  const assetBigIntIds = assetIntIds.map((n) => BigInt(n));
  const devices = await db
    .select({
      id: devicesTable.id,
      assetId: devicesTable.assetId,
      name: devicesTable.name,
      serialNumber: devicesTable.serialNumber,
    })
    .from(devicesTable)
    .where(inArray(devicesTable.assetId, assetBigIntIds));

  if (devices.length === 0) {
    return { geofence: { name: geofence.name, geofenceTypeId: geofence.geofenceTypeId, geometry }, assets: [] };
  }

  // 5.5 Get sensors per device
  const deviceIds = devices.map((d) => d.id);
  const deviceSensorRows = await db
    .select({
      deviceId: deviceSensorsTable.deviceId,
      sensorName: deviceSensorsTable.name,
      sensorTypeName: sensorTypesTable.name,
    })
    .from(deviceSensorsTable)
    .leftJoin(sensorTable, eq(deviceSensorsTable.sensorId, sensorTable.id))
    .leftJoin(sensorTypesTable, eq(sensorTable.stId, sensorTypesTable.id))
    .where(and(
      inArray(deviceSensorsTable.deviceId, deviceIds),
      eq(deviceSensorsTable.enabled, true)
    ));

  const sensorsByDevice = new Map<string, { name: string; sensorTypeName: string }[]>();
  for (const row of deviceSensorRows) {
    const key = String(row.deviceId);
    if (!sensorsByDevice.has(key)) sensorsByDevice.set(key, []);
    sensorsByDevice.get(key)!.push({
      name: row.sensorName ?? row.sensorTypeName ?? 'Unknown',
      sensorTypeName: row.sensorTypeName ?? '',
    });
  }

  // 6. Get latest telemetry per device
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

  const latestByDevice = new Map<string, typeof telemetryRows[0]>();
  for (const row of telemetryRows) {
    const key = String(row.deviceId);
    if (!latestByDevice.has(key)) {
      latestByDevice.set(key, row);
    }
  }

  // 7. Build assets list
  const assetMap = new Map(assets.map((a) => [a.id, a]));
  const devicesByAsset = new Map<number, typeof devices[0]>();
  for (const device of devices) {
    if (device.assetId !== null) {
      devicesByAsset.set(Number(device.assetId), device);
    }
  }

  const assetsWithPositions: GeofenceMapData['assets'] = [];
  for (const asset of assets) {
    const device = devicesByAsset.get(asset.id);
    if (!device) continue;
    const latest = latestByDevice.get(String(device.id));
    if (!latest) continue;
    assetsWithPositions.push({
      id: assetMap.get(asset.id)!.id,
      number: asset.number,
      lastLat: latest.latitude,
      lastLng: latest.longitude,
      lastTimestamp: latest.eventTimestamp,
      deviceId: device.id,
      deviceName: device.name,
      deviceSerialNumber: device.serialNumber,
      sensors: sensorsByDevice.get(String(device.id)) ?? [],
    });
  }

  return {
    geofence: { name: geofence.name, geofenceTypeId: geofence.geofenceTypeId, geometry },
    assets: assetsWithPositions,
  };
}
