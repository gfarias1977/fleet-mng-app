'use server';

import { z } from 'zod';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getUserByEmail } from '@/data/users';
import {
  createDevice,
  updateDevice,
  deleteDevice,
  getDeviceSensors,
  getAvailableSensors,
  assignSensorToDevice,
  unassignSensorFromDevice,
  type DeviceRow,
  type DeviceSensorRow,
  type SensorSelectRow,
} from '@/data/devices';

// ---------------------------------------------------------------------------
// Shared result type
// ---------------------------------------------------------------------------

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function resolveUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const clerkUser = await currentUser();
  const primaryEmail = clerkUser?.emailAddresses[0]?.emailAddress;
  if (!primaryEmail) return null;

  return getUserByEmail(primaryEmail);
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createDeviceSchema = z.object({
  serialNumber: z.string().min(1, 'Número de serie requerido').max(100),
  name: z.string().min(1, 'Nombre requerido').max(100),
  deviceTypeId: z.coerce.number().int().positive('Tipo de dispositivo requerido'),
  assetId: z.coerce.number().int().positive().optional().nullable(),
  brand: z.string().max(50).optional().nullable(),
  model: z.string().max(50).optional().nullable(),
  gateway: z.string().max(100).optional().nullable(),
  macAddress: z.string().max(17).optional().nullable(),
  active: z.boolean().default(true),
});

const updateDeviceSchema = createDeviceSchema.extend({
  id: z.string().min(1),
});

const deleteDeviceSchema = z.object({
  id: z.string().min(1),
});

const sensorAssignSchema = z.object({
  deviceId: z.string().min(1),
  sensorId: z.coerce.number().int().positive(),
  customName: z.string().max(50).optional().nullable(),
});

const sensorUnassignSchema = z.object({
  deviceId: z.string().min(1),
  sensorId: z.coerce.number().int().positive(),
});

// ---------------------------------------------------------------------------
// Actions — CRUD
// ---------------------------------------------------------------------------

export async function createDeviceAction(
  input: z.infer<typeof createDeviceSchema>
): Promise<ActionResult<DeviceRow>> {
  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  const parsed = createDeviceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const { ...data } = parsed.data;
    const record = await createDevice(user.id, data);
    return { success: true, data: record };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function updateDeviceAction(
  input: z.infer<typeof updateDeviceSchema>
): Promise<ActionResult<DeviceRow>> {
  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  const parsed = updateDeviceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const { id, ...rest } = parsed.data;
    const record = await updateDevice(BigInt(id), user.id, rest);
    return { success: true, data: record };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function deleteDeviceAction(
  input: z.infer<typeof deleteDeviceSchema>
): Promise<ActionResult> {
  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  const parsed = deleteDeviceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await deleteDevice(BigInt(parsed.data.id), user.id);
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Actions — Sensor assignment
// ---------------------------------------------------------------------------

export async function getSensorsForDeviceAction(
  deviceId: string
): Promise<ActionResult<DeviceSensorRow[]>> {
  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  try {
    const sensors = await getDeviceSensors(BigInt(deviceId), user.id);
    return { success: true, data: sensors };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function getAvailableSensorsAction(
  deviceId: string
): Promise<ActionResult<SensorSelectRow[]>> {
  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  try {
    const sensors = await getAvailableSensors(BigInt(deviceId));
    return { success: true, data: sensors };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function assignSensorAction(
  input: z.infer<typeof sensorAssignSchema>
): Promise<ActionResult> {
  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  const parsed = sensorAssignSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await assignSensorToDevice(
      BigInt(parsed.data.deviceId),
      parsed.data.sensorId,
      user.id,
      parsed.data.customName
    );
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function unassignSensorAction(
  input: z.infer<typeof sensorUnassignSchema>
): Promise<ActionResult> {
  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  const parsed = sensorUnassignSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await unassignSensorFromDevice(
      BigInt(parsed.data.deviceId),
      parsed.data.sensorId,
      user.id
    );
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}
