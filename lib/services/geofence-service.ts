import { db } from '@/src/db';
import {
  assetGeofenceAssignmentsTable,
  devicesTable,
  geofencesTable,
  geofenceTypesTable,
  geofencePolygonPointsTable,
  geofenceRectanglesTable,
} from '@/src/db/schema';
import { and, eq, isNull, lte, gte, or, asc } from 'drizzle-orm';

export interface GeofenceEvaluation {
  assignmentId: bigint;
  geofenceId: bigint;
  geofenceName: string;
  geofenceTypeName: string;
  distanceMeters: number;
  radiusMeters: number;
  isInside: boolean;
  alertOnExit: boolean;
  alertOnEntry: boolean;
  alertOnDwell: boolean;
  dwellTimeThreshold: number | null;
}

const EARTH_RADIUS_M = 6_371_000;

export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

// Ray-casting algorithm: point inside polygon
function isInsidePolygon(
  lat: number,
  lng: number,
  points: { lat: number; lng: number }[]
): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].lat, yi = points[i].lng;
    const xj = points[j].lat, yj = points[j].lng;
    const intersects =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

// Bounding box check for rectangular geofence
function isInsideRectangle(
  lat: number,
  lng: number,
  nwLat: number,
  nwLng: number,
  seLat: number,
  seLng: number
): boolean {
  return lat <= nwLat && lat >= seLat && lng >= nwLng && lng <= seLng;
}

interface ActiveAssignment {
  assignmentId: bigint;
  geofenceId: bigint;
  geofenceName: string;
  typeName: string;
  centerLatitude: string | null;
  centerLongitude: string | null;
  radiusMeters: string | null;
  alertOnExit: boolean | null;
  alertOnEntry: boolean | null;
  alertOnDwell: boolean | null;
  dwellTimeThreshold: number | null;
}

async function getActiveAssignments(
  deviceId: bigint,
  at: Date
): Promise<ActiveAssignment[]> {
  return db
    .select({
      assignmentId: assetGeofenceAssignmentsTable.id,
      geofenceId: geofencesTable.id,
      geofenceName: geofencesTable.name,
      typeName: geofenceTypesTable.name,
      centerLatitude: geofencesTable.centerLatitude,
      centerLongitude: geofencesTable.centerLongitude,
      radiusMeters: geofencesTable.radiusMeters,
      alertOnExit: assetGeofenceAssignmentsTable.alertOnExit,
      alertOnEntry: assetGeofenceAssignmentsTable.alertOnEntry,
      alertOnDwell: assetGeofenceAssignmentsTable.alertOnDwell,
      dwellTimeThreshold: assetGeofenceAssignmentsTable.dwellTimeThreshold,
    })
    .from(devicesTable)
    .innerJoin(
      assetGeofenceAssignmentsTable,
      eq(devicesTable.assetId, assetGeofenceAssignmentsTable.assetId)
    )
    .innerJoin(
      geofencesTable,
      eq(assetGeofenceAssignmentsTable.geofenceId, geofencesTable.id)
    )
    .innerJoin(
      geofenceTypesTable,
      eq(geofencesTable.geofenceTypeId, geofenceTypesTable.id)
    )
    .where(
      and(
        eq(devicesTable.id, deviceId),
        eq(assetGeofenceAssignmentsTable.isActive, true),
        lte(assetGeofenceAssignmentsTable.validFrom, at),
        or(
          isNull(assetGeofenceAssignmentsTable.validUntil),
          gte(assetGeofenceAssignmentsTable.validUntil, at)
        ),
        eq(geofencesTable.active, true)
      )
    );
}

export async function evaluateGeofencePositions(
  deviceId: bigint,
  lat: number,
  lng: number,
  at: Date
): Promise<GeofenceEvaluation[]> {
  const assignments = await getActiveAssignments(deviceId, at);
  const evaluations: GeofenceEvaluation[] = [];

  for (const a of assignments) {
    const typeName = a.typeName.toLowerCase();
    let isInside = false;
    let distanceMeters = 0;
    let radiusMeters = 0;

    if (typeName === 'circular') {
      if (!a.centerLatitude || !a.centerLongitude || !a.radiusMeters) continue;
      const centerLat = parseFloat(a.centerLatitude);
      const centerLng = parseFloat(a.centerLongitude);
      radiusMeters = parseFloat(a.radiusMeters);
      distanceMeters = haversineDistanceMeters(lat, lng, centerLat, centerLng);
      isInside = distanceMeters <= radiusMeters;

    } else if (typeName === 'polygon') {
      const rows = await db
        .select({
          lat: geofencePolygonPointsTable.latitude,
          lng: geofencePolygonPointsTable.longitude,
        })
        .from(geofencePolygonPointsTable)
        .where(eq(geofencePolygonPointsTable.geofenceId, a.geofenceId))
        .orderBy(asc(geofencePolygonPointsTable.pointOrder));

      if (rows.length < 3) continue;
      const pts = rows.map((r) => ({ lat: parseFloat(r.lat), lng: parseFloat(r.lng) }));
      isInside = isInsidePolygon(lat, lng, pts);

    } else if (typeName === 'rectangular') {
      const [rect] = await db
        .select({
          nwLat: geofenceRectanglesTable.nwLatitude,
          nwLng: geofenceRectanglesTable.nwLongitude,
          seLat: geofenceRectanglesTable.seLatitude,
          seLng: geofenceRectanglesTable.seLongitude,
        })
        .from(geofenceRectanglesTable)
        .where(eq(geofenceRectanglesTable.geofenceId, a.geofenceId))
        .limit(1);

      if (!rect) continue;
      isInside = isInsideRectangle(
        lat, lng,
        parseFloat(rect.nwLat),
        parseFloat(rect.nwLng),
        parseFloat(rect.seLat),
        parseFloat(rect.seLng)
      );

    } else {
      // Unknown type — skip silently
      continue;
    }

    evaluations.push({
      assignmentId: a.assignmentId,
      geofenceId: a.geofenceId,
      geofenceName: a.geofenceName,
      geofenceTypeName: typeName,
      distanceMeters,
      radiusMeters,
      isInside,
      alertOnExit: a.alertOnExit ?? false,
      alertOnEntry: a.alertOnEntry ?? false,
      alertOnDwell: a.alertOnDwell ?? false,
      dwellTimeThreshold: a.dwellTimeThreshold,
    });
  }

  return evaluations;
}
