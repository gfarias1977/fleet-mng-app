import { db } from '@/src/db';
import { deviceGeofenceAssignmentsTable, geofencesTable } from '@/src/db/schema';
import { and, eq, isNull, lte, gte, or } from 'drizzle-orm';

export interface GeofenceEvaluation {
  assignmentId: bigint;
  geofenceId: bigint;
  geofenceName: string;
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

interface ActiveAssignment {
  assignmentId: bigint;
  geofenceId: bigint;
  geofenceName: string;
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
      assignmentId: deviceGeofenceAssignmentsTable.id,
      geofenceId: geofencesTable.id,
      geofenceName: geofencesTable.name,
      centerLatitude: geofencesTable.centerLatitude,
      centerLongitude: geofencesTable.centerLongitude,
      radiusMeters: geofencesTable.radiusMeters,
      alertOnExit: deviceGeofenceAssignmentsTable.alertOnExit,
      alertOnEntry: deviceGeofenceAssignmentsTable.alertOnEntry,
      alertOnDwell: deviceGeofenceAssignmentsTable.alertOnDwell,
      dwellTimeThreshold: deviceGeofenceAssignmentsTable.dwellTimeThreshold,
    })
    .from(deviceGeofenceAssignmentsTable)
    .innerJoin(
      geofencesTable,
      eq(deviceGeofenceAssignmentsTable.geofenceId, geofencesTable.id)
    )
    .where(
      and(
        eq(deviceGeofenceAssignmentsTable.deviceId, deviceId),
        eq(deviceGeofenceAssignmentsTable.isActive, true),
        lte(deviceGeofenceAssignmentsTable.validFrom, at),
        or(
          isNull(deviceGeofenceAssignmentsTable.validUntil),
          gte(deviceGeofenceAssignmentsTable.validUntil, at)
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
    if (!a.centerLatitude || !a.centerLongitude || !a.radiusMeters) continue;

    const centerLat = parseFloat(a.centerLatitude);
    const centerLng = parseFloat(a.centerLongitude);
    const radius = parseFloat(a.radiusMeters);
    const distance = haversineDistanceMeters(lat, lng, centerLat, centerLng);
    const isInside = distance <= radius;

    evaluations.push({
      assignmentId: a.assignmentId,
      geofenceId: a.geofenceId,
      geofenceName: a.geofenceName,
      distanceMeters: distance,
      radiusMeters: radius,
      isInside,
      alertOnExit: a.alertOnExit ?? false,
      alertOnEntry: a.alertOnEntry ?? false,
      alertOnDwell: a.alertOnDwell ?? false,
      dwellTimeThreshold: a.dwellTimeThreshold,
    });
  }

  return evaluations;
}
