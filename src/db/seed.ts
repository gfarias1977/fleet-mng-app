import 'dotenv/config';
import * as readline from 'readline';
import { eq, inArray } from 'drizzle-orm';
import { db } from './index';
import {
  usersTable,
  deviceTypesTable,
  devicesTable,
  sensorTypesTable,
  sensorTable,
  deviceSensorsTable,
  geofenceTypesTable,
  geofencesTable,
  assetGeofenceAssignmentsTable,
  telemetryEventsTable,
  alertTypesTable,
  geofenceAlertRulesTable,
  assetTypesTable,
  assetTable,
} from './schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SeedContext = {
  user?: { id: bigint; name: string; email: string };
  device1?: { id: bigint; name: string };
  device2?: { id: bigint; name: string };
  geofence?: { id: bigint; name: string };
  assets?: { id: number }[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function resolveUser(ctx: SeedContext) {
  if (ctx.user) return ctx.user;
  const [row] = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.email, 'gabriel.farias@techforge.cl'));
  if (!row) throw new Error('User not found. Run section "Usuarios y dispositivos" first.');
  return row;
}

async function resolveDevices(ctx: SeedContext) {
  if (ctx.device1 && ctx.device2) return { device1: ctx.device1, device2: ctx.device2 };
  const rows = await db
    .select({ id: devicesTable.id, name: devicesTable.name })
    .from(devicesTable)
    .limit(2);
  if (rows.length < 2) throw new Error('Devices not found. Run section "Usuarios y dispositivos" first.');
  return { device1: rows[0], device2: rows[1] };
}

async function resolveGeofence(ctx: SeedContext) {
  if (ctx.geofence) return ctx.geofence;
  const [row] = await db
    .select({ id: geofencesTable.id, name: geofencesTable.name })
    .from(geofencesTable)
    .where(eq(geofencesTable.name, 'Zona de Distribución Las Condes'));
  if (!row) throw new Error('Geofence not found. Run section "Geocercas y asignaciones" first.');
  return row;
}

// ---------------------------------------------------------------------------
// Seed sections
// ---------------------------------------------------------------------------

async function seedAlertTypes(ctx: SeedContext): Promise<SeedContext> {
  console.log('\n🔔 Creando alert types...');
  await db.insert(alertTypesTable).values([
    {
      name: 'geofence_exit',
      category: 'geofence',
      description: 'Device has exited a monitored geofence',
      priority: 2,
      requiresAcknowledgment: true,
      defaultMessage: 'Device exited geofence boundary',
      isActive: true,
    },
    {
      name: 'geofence_entry',
      category: 'geofence',
      description: 'Device has entered a monitored geofence',
      priority: 1,
      requiresAcknowledgment: false,
      defaultMessage: 'Device entered geofence boundary',
      isActive: true,
    },
    {
      name: 'geofence_dwell',
      category: 'geofence',
      description: 'Device has been dwelling inside a geofence beyond the threshold',
      priority: 1,
      requiresAcknowledgment: false,
      defaultMessage: 'Device dwelling inside geofence',
      isActive: true,
    },
  ]).onConflictDoNothing();
  console.log('✅ Alert types: geofence_exit, geofence_entry, geofence_dwell');
  return ctx;
}

async function seedUsers(ctx: SeedContext): Promise<SeedContext> {
  console.log('\n👤 Creando usuario...');
  await db.insert(usersTable).values({
    name: 'Gabriel Farías',
    email: 'gabriel.farias@techforge.cl',
    phone: '+56912345678',
    active: true,
  }).onConflictDoNothing();
  const user = await resolveUser(ctx);
  console.log(`✅ Usuario: ${user.name} (ID: ${user.id})`);
  return { ...ctx, user };
}

async function seedSensors(ctx: SeedContext): Promise<SeedContext> {
  console.log('\n🔧 Creando sensor types...');
  await db.insert(sensorTypesTable).values([
    { name: 'GPS Sensor',         description: 'Global Positioning System sensor for location tracking', isActive: true },
    { name: 'Temperature Sensor', description: 'Digital temperature sensor', isActive: true },
  ]).onConflictDoNothing();

  const sensorTypes = await db
    .select({ id: sensorTypesTable.id, name: sensorTypesTable.name })
    .from(sensorTypesTable)
    .where(inArray(sensorTypesTable.name, ['GPS Sensor', 'Temperature Sensor']));

  const gpsSensorType  = sensorTypes.find((t) => t.name === 'GPS Sensor')!;
  const tempSensorType = sensorTypes.find((t) => t.name === 'Temperature Sensor')!;

  console.log('📡 Creando sensores...');
  await db.insert(sensorTable).values([
    { stId: gpsSensorType.id,  name: 'NEO-6M GPS Module',        status: 'active' },
    { stId: tempSensorType.id, name: 'DS18B20 Temperature Sensor', status: 'active' },
  ]).onConflictDoNothing();

  console.log('✅ Sensores: NEO-6M GPS Module, DS18B20 Temperature Sensor');
  return ctx;
}

async function seedDevices(ctx: SeedContext): Promise<SeedContext> {
  const user = await resolveUser(ctx);

  console.log('\n📱 Creando device type...');
  await db.insert(deviceTypesTable).values({
    name: 'GPS Tracker Pro',
    description: 'Professional GPS tracking device with real-time location',
    capabilities: ['gps', 'gsm', 'accelerometer', 'temperature'],
    isActive: true,
  }).onConflictDoNothing();
  const [deviceType] = await db
    .select({ id: deviceTypesTable.id })
    .from(deviceTypesTable)
    .where(eq(deviceTypesTable.name, 'GPS Tracker Pro'))
    .limit(1);

  // Link to assets (use ctx.assets if available, otherwise query from DB)
  const assets = ctx.assets ?? await db.select({ id: assetTable.id }).from(assetTable).limit(2);
  const asset1Id = assets[0]?.id ?? null;
  const asset2Id = assets[1]?.id ?? null;

  console.log('📟 Creando dispositivos...');
  await db.insert(devicesTable).values([
    {
      userId: user.id,
      deviceTypeId: deviceType.id,
      serialNumber: 'SN-TRK-001',
      name: 'Truck Fleet #001',
      model: 'GT06N',
      brand: 'Concox',
      assetId: asset1Id ? BigInt(asset1Id) : null,
      status: 'online',
      active: true,
    },
    {
      userId: user.id,
      deviceTypeId: deviceType.id,
      serialNumber: 'SN-VAN-042',
      name: 'Delivery Van #042',
      model: 'GT06N',
      brand: 'Concox',
      assetId: asset2Id ? BigInt(asset2Id) : null,
      status: 'online',
      active: true,
    },
  ]).onConflictDoNothing();

  const deviceRows = await db
    .select({ id: devicesTable.id, name: devicesTable.name })
    .from(devicesTable)
    .where(inArray(devicesTable.serialNumber, ['SN-TRK-001', 'SN-VAN-042']));

  const device1 = deviceRows.find((d) => d.name === 'Truck Fleet #001')!;
  const device2 = deviceRows.find((d) => d.name === 'Delivery Van #042')!;

  if (asset1Id && asset2Id) {
    console.log(`  → ${device1.name} asignado a asset ID ${asset1Id}`);
    console.log(`  → ${device2.name} asignado a asset ID ${asset2Id}`);
  } else {
    console.warn('  ⚠️  No se encontraron assets. Correr sección "Assets" primero para activar geofencing.');
  }

  console.log('🔗 Asignando sensores a dispositivos...');
  const sensors = await db.select({ id: sensorTable.id }).from(sensorTable).limit(2);
  if (sensors.length >= 2) {
    await db.insert(deviceSensorsTable).values([
      { deviceId: device1.id, sensorId: sensors[0].id, name: 'Primary GPS', enabled: true },
      { deviceId: device1.id, sensorId: sensors[1].id, name: 'Cargo Temperature', enabled: true },
      { deviceId: device2.id, sensorId: sensors[0].id, name: 'Primary GPS', enabled: true },
      { deviceId: device2.id, sensorId: sensors[1].id, name: 'Cargo Temperature', enabled: true },
    ]).onConflictDoNothing();
  }

  console.log(`✅ Dispositivos: ${device1.name}, ${device2.name}`);
  return { ...ctx, device1, device2 };
}

async function seedGeofences(ctx: SeedContext): Promise<SeedContext> {
  const user = await resolveUser(ctx);

  console.log('\n🗺️  Creando geofence type...');
  await db.insert(geofenceTypesTable).values({
    name: 'Polygon Area',
    description: 'General polygon geofence',
    isActive: true,
  }).onConflictDoNothing();
  const [geofenceType] = await db
    .select({ id: geofenceTypesTable.id })
    .from(geofenceTypesTable)
    .where(eq(geofenceTypesTable.name, 'Polygon Area'))
    .limit(1);

  console.log('📍 Creando geocerca...');
  await db.insert(geofencesTable).values({
    userId: user.id,
    name: 'Zona de Distribución Las Condes',
    description: 'Área autorizada de distribución en Las Condes, Santiago',
    geofenceTypeId: geofenceType.id,
    centerLatitude: '-33.4135',
    centerLongitude: '-70.58',
    radiusMeters: '800',
    active: true,
  }).onConflictDoNothing();
  const [geofence] = await db
    .select({ id: geofencesTable.id, name: geofencesTable.name })
    .from(geofencesTable)
    .where(eq(geofencesTable.name, 'Zona de Distribución Las Condes'))
    .limit(1);

  console.log('🔗 Asignando assets a geocerca...');
  const assets = ctx.assets ?? await db.select({ id: assetTable.id }).from(assetTable).limit(2);
  if (assets.length < 2) throw new Error('Assets not found. Run section "Assets y asset types" first.');

  const now = new Date();
  const validUntil = new Date();
  validUntil.setMonth(validUntil.getMonth() + 6);

  await db.insert(assetGeofenceAssignmentsTable).values([
    {
      geofenceId: geofence.id,
      assetId: assets[0].id,
      validFrom: now,
      validUntil,
      isActive: true,
      priority: 1,
      alertOnEntry: true,
      alertOnExit: true,
      alertOnDwell: false,
      properties: { purpose: 'delivery', maxStayTime: 120 },
    },
    {
      geofenceId: geofence.id,
      assetId: assets[1].id,
      validFrom: now,
      validUntil,
      isActive: true,
      priority: 1,
      alertOnEntry: true,
      alertOnExit: true,
      alertOnDwell: false,
      properties: { purpose: 'delivery', maxStayTime: 90 },
    },
  ]).onConflictDoNothing();

  console.log(`✅ Geocerca: ${geofence.name}`);
  return { ...ctx, geofence };
}

async function seedTrackingEvents(ctx: SeedContext): Promise<SeedContext> {
  const { device1, device2 } = await resolveDevices(ctx);

  console.log('\n📊 Creando tracking events...');
  const device1Events = [
    { deviceId: device1.id, eventTimestamp: new Date(Date.now() - 15 * 60 * 1000), latitude: '-33.41450000', longitude: '-70.58000000' },
    { deviceId: device1.id, eventTimestamp: new Date(Date.now() - 5 * 60 * 1000),  latitude: '-33.41500000', longitude: '-70.57850000' },
    { deviceId: device1.id, eventTimestamp: new Date(),                             latitude: '-33.41550000', longitude: '-70.57700000' },
  ];
  const device2Events = [
    { deviceId: device2.id, eventTimestamp: new Date(Date.now() - 20 * 60 * 1000), latitude: '-33.41200000', longitude: '-70.58200000' },
    { deviceId: device2.id, eventTimestamp: new Date(Date.now() - 10 * 60 * 1000), latitude: '-33.41300000', longitude: '-70.57950000' },
    { deviceId: device2.id, eventTimestamp: new Date(),                             latitude: '-33.41400000', longitude: '-70.57800000' },
  ];

  await db.insert(telemetryEventsTable).values([...device1Events, ...device2Events]);
  console.log(`✅ Tracking events: ${device1Events.length + device2Events.length} eventos`);
  return ctx;
}

async function seedAssetsAndTypes(ctx: SeedContext): Promise<SeedContext> {
  const assetTypeNames = ['Vehículo Liviano', 'Camión', 'Maquinaria Pesada', 'Motocicleta', 'Remolque'];

  console.log('\n🏗️  Creando asset types...');
  await db.insert(assetTypesTable).values(
    assetTypeNames.map((name) => ({ name, status: 'active' as const }))
  ).onConflictDoNothing();

  const assetTypes = await db
    .select({ id: assetTypesTable.id, name: assetTypesTable.name })
    .from(assetTypesTable)
    .where(inArray(assetTypesTable.name, assetTypeNames));

  const byName = Object.fromEntries(assetTypes.map((t) => [t.name, t.id]));
  const car       = byName['Vehículo Liviano'];
  const truck     = byName['Camión'];
  const machinery = byName['Maquinaria Pesada'];
  const moto      = byName['Motocicleta'];
  const trailer   = byName['Remolque'];

  console.log('🚗 Creando assets...');
  await db.insert(assetTable).values([
    { assetTypeId: car,       number: 'ABC-123', status: 'active' },
    { assetTypeId: car,       number: 'DEF-456', status: 'active' },
    { assetTypeId: car,       number: 'GHI-789', status: 'inactive' },
    { assetTypeId: truck,     number: 'CAM-001', status: 'active' },
    { assetTypeId: truck,     number: 'CAM-002', status: 'active' },
    { assetTypeId: truck,     number: 'CAM-003', status: 'active' },
    { assetTypeId: machinery, number: 'MAQ-001', status: 'active' },
    { assetTypeId: machinery, number: 'MAQ-002', status: 'inactive' },
    { assetTypeId: moto,      number: 'MOT-001', status: 'active' },
    { assetTypeId: moto,      number: 'MOT-002', status: 'active' },
    { assetTypeId: trailer,   number: 'REM-001', status: 'active' },
    { assetTypeId: trailer,   number: 'REM-002', status: 'inactive' },
  ]).onConflictDoNothing();

  const insertedAssets = await db
    .select({ id: assetTable.id })
    .from(assetTable)
    .where(inArray(assetTable.number, ['ABC-123', 'DEF-456', 'GHI-789', 'CAM-001', 'CAM-002', 'CAM-003', 'MAQ-001', 'MAQ-002', 'MOT-001', 'MOT-002', 'REM-001', 'REM-002']));

  console.log(`✅ Assets: ${insertedAssets.length} registros`);
  return { ...ctx, assets: insertedAssets };
}

async function seedGeofenceAlertRules(ctx: SeedContext): Promise<SeedContext> {
  const user = await resolveUser(ctx);
  const geofence = await resolveGeofence(ctx);

  console.log('\n🔔 Creando geofence alert rules...');
  const [exitType] = await db.select({ id: alertTypesTable.id }).from(alertTypesTable).where(eq(alertTypesTable.name, 'geofence_exit'));
  const [entryType] = await db.select({ id: alertTypesTable.id }).from(alertTypesTable).where(eq(alertTypesTable.name, 'geofence_entry'));
  const [dwellType] = await db.select({ id: alertTypesTable.id }).from(alertTypesTable).where(eq(alertTypesTable.name, 'geofence_dwell'));

  if (!exitType || !entryType || !dwellType) {
    throw new Error('Alert types not found. Run section "Alert types" first.');
  }

  await db.insert(geofenceAlertRulesTable).values([
    {
      geofenceId: geofence.id,
      alertTypeId: exitType.id,
      conditionType: 'boundary_exit',
      cooldownPeriod: 300,
      minimumDuration: 0,
      notifyUsers: [String(user.id)],
      notificationChannels: ['in_app', 'email'],
      priority: 2,
      active: true,
    },
    {
      geofenceId: geofence.id,
      alertTypeId: entryType.id,
      conditionType: 'boundary_entry',
      cooldownPeriod: 60,
      minimumDuration: 0,
      notifyUsers: [String(user.id)],
      notificationChannels: ['in_app'],
      priority: 1,
      active: true,
    },
    {
      geofenceId: geofence.id,
      alertTypeId: dwellType.id,
      conditionType: 'dwell_time',
      thresholdValue: '30',
      thresholdUnit: 'minutes',
      cooldownPeriod: 1800,
      minimumDuration: 1800000,
      notifyUsers: [String(user.id)],
      notificationChannels: ['in_app', 'email'],
      priority: 1,
      active: true,
    },
  ]).onConflictDoNothing();

  console.log('✅ Geofence alert rules: 3 reglas');
  return ctx;
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

const SECTIONS = [
  { key: '1', label: 'Alert types',          fn: seedAlertTypes },
  { key: '2', label: 'Usuarios',             fn: seedUsers },
  { key: '3', label: 'Sensores',             fn: seedSensors },
  { key: '4', label: 'Dispositivos',         fn: seedDevices },
  { key: '5', label: 'Assets y asset types', fn: seedAssetsAndTypes },
  { key: '6', label: 'Geocercas',            fn: seedGeofences },
  { key: '7', label: 'Tracking events',      fn: seedTrackingEvents },
  { key: '8', label: 'Geofence alert rules', fn: seedGeofenceAlertRules },
] as const;

function printMenu() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║    🌱  Fleet Management — Seed Menu     ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log('║  [A] Todo (seed completo)               ║');
  console.log('║  ──────────────────────────────────────  ║');
  for (const s of SECTIONS) {
    const label = `[${s.key}] ${s.label}`;
    console.log(`║  ${label.padEnd(40)} ║`);
  }
  console.log('║  ──────────────────────────────────────  ║');
  console.log('║  [q] Salir                              ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('\n  Selecciona opciones separadas por coma');
  console.log('  Ejemplo: 1,2,3  o  A\n');
}

(async () => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    printMenu();
    const raw = await ask(rl, '  Opción(es): ');
    rl.close();

    const input = raw.trim().toUpperCase();

    if (input === 'Q' || input === '') {
      console.log('\n👋 Saliendo sin cambios.');
      process.exit(0);
    }

    // Resolve selected keys
    let selectedKeys: string[];
    if (input === 'A') {
      selectedKeys = SECTIONS.map((s) => s.key);
    } else {
      selectedKeys = input.split(',').map((k) => k.trim());
      const invalid = selectedKeys.filter((k) => !SECTIONS.find((s) => s.key === k));
      if (invalid.length > 0) {
        console.error(`\n❌ Opción(es) inválida(s): ${invalid.join(', ')}`);
        process.exit(1);
      }
    }

    // Run sections in defined order (respects dependencies)
    const toRun = SECTIONS.filter((s) => selectedKeys.includes(s.key));
    console.log(`\n🚀 Ejecutando: ${toRun.map((s) => s.label).join(', ')}\n`);

    let ctx: SeedContext = {};
    for (const section of toRun) {
      ctx = await section.fn(ctx);
    }

    console.log('\n✨ Seed completado!\n');
    process.exit(0);
  } catch (error) {
    rl.close();
    console.error('\n❌ Seed falló:', error);
    process.exit(1);
  }
})();
