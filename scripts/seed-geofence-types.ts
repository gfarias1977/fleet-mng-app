import 'dotenv/config';
import { db } from '../src/db';
import { geofenceTypesTable } from '../src/db/schema';

async function main() {
  console.log('Seeding geofence types...');

  await db.insert(geofenceTypesTable).values([
    { name: 'circular',    description: 'Circular geofence defined by center + radius', isActive: true },
    { name: 'polygon',     description: 'Polygon geofence defined by vertices', isActive: true },
    { name: 'rectangular', description: 'Rectangular geofence defined by NW and SE corners', isActive: true },
  ]).onConflictDoNothing();

  const types = await db.select({ id: geofenceTypesTable.id, name: geofenceTypesTable.name })
    .from(geofenceTypesTable);

  console.log('Geofence types:', types);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
