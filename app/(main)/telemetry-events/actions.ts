'use server';

import { z } from 'zod';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getUserByEmail } from '@/data/users';
import {
  updateTelemetryEvent,
  deleteTelemetryEvent,
  type TelemetryEventRow,
} from '@/data/telemetry-events';

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

const updateSchema = z.object({
  id: z.string().min(1),
  eventTimestamp: z.coerce.date().optional(),
  latitude: z
    .string()
    .regex(/^-?\d+(\.\d+)?$/, 'Latitud inválida')
    .optional(),
  longitude: z
    .string()
    .regex(/^-?\d+(\.\d+)?$/, 'Longitud inválida')
    .optional(),
  jsonData: z.string().optional().nullable(),
});

const deleteSchema = z.object({ id: z.string().min(1) });

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function updateTelemetryEventAction(
  input: z.infer<typeof updateSchema>
): Promise<ActionResult<TelemetryEventRow>> {
  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const { id, jsonData, ...rest } = parsed.data;

    let parsedJsonData: unknown = undefined;
    if (jsonData !== undefined) {
      if (jsonData === null || jsonData === '') {
        parsedJsonData = null;
      } else {
        try {
          parsedJsonData = JSON.parse(jsonData);
        } catch {
          return { success: false, error: 'JSON inválido en Datos JSON.' };
        }
      }
    }

    const record = await updateTelemetryEvent(BigInt(id), user.id, {
      ...rest,
      ...(parsedJsonData !== undefined && { jsonData: parsedJsonData }),
    });
    return { success: true, data: record };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}

export async function deleteTelemetryEventAction(
  input: z.infer<typeof deleteSchema>
): Promise<ActionResult> {
  const user = await resolveUser();
  if (!user) return { success: false, error: 'User not found.' };

  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await deleteTelemetryEvent(BigInt(parsed.data.id), user.id);
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return { success: false, error: message };
  }
}
