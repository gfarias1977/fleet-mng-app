# Data Mutations Coding Standards

## Overview

All data mutations follow a strict two-layer pattern:

1. **`src/data/` helper** — a plain async function that wraps a Drizzle ORM write operation
2. **Server Action in `actions.ts`** — validates input with Zod, calls the data helper, returns a typed result

No other mutation pattern is permitted.

---

## Layer 1 — Data helpers in `src/data/`

All database write operations (insert, update, delete) must be encapsulated in helper functions inside `src/data/`. The same directory used for read helpers (see `docs/data-fetching.md`) is used for mutations — one file per domain entity.

- Use Drizzle ORM for every query. Raw SQL is never permitted.
- Functions must be named clearly for the operation they perform (`createDevice`, `updateGeofence`, `deleteAlert`, etc.).
- Functions accept plain typed parameters — never `FormData`, never a raw request object.
- Functions are only called from Server Actions, never from Client Components or route handlers.

```ts
// ✅ Correct — src/data/devices.ts
import { db } from '@/src/db';
import { devicesTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function createDevice(input: {
  userId: bigint;
  name: string;
  uuid: string;
}) {
  const [device] = await db
    .insert(devicesTable)
    .values(input)
    .returning();
  return device;
}

export async function updateDevice(id: bigint, userId: bigint, input: {
  name?: string;
}) {
  const [device] = await db
    .update(devicesTable)
    .set(input)
    .where(and(eq(devicesTable.id, id), eq(devicesTable.userId, userId)))
    .returning();
  return device;
}

export async function deleteDevice(id: bigint, userId: bigint) {
  await db
    .delete(devicesTable)
    .where(and(eq(devicesTable.id, id), eq(devicesTable.userId, userId)));
}

// ❌ Wrong — raw SQL
await db.execute(sql`INSERT INTO devices ...`);

// ❌ Wrong — mutation logic inside a Server Action
await db.insert(devicesTable).values(...); // belongs in src/data/, not in actions.ts
```

### Scoping mutations to the current user

Every mutation helper that operates on user-owned records must include a `userId` condition in its `where` clause. This prevents one user from modifying another user's data. The Server Action is responsible for supplying the authenticated `userId` obtained from Clerk's `auth()` — never from client input.

---

## Layer 2 — Server Actions in `actions.ts`

All mutations exposed to the UI must be implemented as [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations).

### File location — colocated `actions.ts`

Server Actions are defined in an `actions.ts` file colocated with the route or feature they serve. The `'use server'` directive goes at the top of the file.

```
app/
  (dashboard)/
    devices/
      page.tsx
      actions.ts       ← Server Actions for the devices feature
    geofences/
      page.tsx
      actions.ts
```

Do not put all Server Actions in a single global file. Colocate them with the feature they belong to.

### Typed parameters — never `FormData`

Server Action parameters must be explicitly typed. `FormData` is never used as a parameter type — extract and validate values before they reach the action signature.

```ts
// ✅ Correct — typed params
export async function createDeviceAction(input: CreateDeviceInput) { ... }

// ❌ Wrong — FormData param
export async function createDeviceAction(formData: FormData) { ... }
```

### Zod validation — mandatory

Every Server Action must validate its arguments with [Zod](https://zod.dev) before doing anything else. If validation fails, return an error result — do not throw.

Define schemas in the same `actions.ts` file unless they are reused across multiple action files, in which case extract them to a colocated `schemas.ts`.

### Return type

Server Actions must return a typed discriminated union result — never `void`, never `throw` for expected errors.

```ts
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
```

### Full example

```ts
// app/(dashboard)/devices/actions.ts
'use server';

import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserByClerkId } from '@/src/data/users';
import { createDevice } from '@/src/data/devices';

const createDeviceSchema = z.object({
  name: z.string().min(1).max(100),
  uuid: z.string().uuid(),
});

type CreateDeviceInput = z.infer<typeof createDeviceSchema>;

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createDeviceAction(
  input: CreateDeviceInput
): Promise<ActionResult<{ id: bigint }>> {
  // 1. Authenticate
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');

  // 2. Validate
  const parsed = createDeviceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  // 3. Resolve internal user
  const user = await getUserByClerkId(clerkId);
  if (!user) return { success: false, error: 'User not found.' };

  // 4. Mutate via data helper
  const device = await createDevice({
    userId: user.id,
    name: parsed.data.name,
    uuid: parsed.data.uuid,
  });

  return { success: true, data: { id: device.id } };
}
```

### Calling a Server Action from a Client Component

```tsx
'use client';

import { createDeviceAction } from './actions';

export function CreateDeviceForm() {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const result = await createDeviceAction({
      name: form.deviceName.value,
      uuid: crypto.randomUUID(),
    });

    if (!result.success) {
      // handle error
    }
  }

  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

## Summary checklist

Before writing any mutation code, verify:

- [ ] The DB write lives in a `src/data/` helper using Drizzle ORM — no raw SQL
- [ ] The data helper scopes the write to the authenticated `userId`
- [ ] The Server Action lives in a colocated `actions.ts` file with `'use server'` at the top
- [ ] The Server Action parameter is a typed object — not `FormData`
- [ ] The Server Action validates input with Zod using `safeParse` before any other logic
- [ ] The Server Action returns a `{ success: true, data }` / `{ success: false, error }` result — it does not throw for expected errors
- [ ] The `userId` passed to the data helper comes from `auth()`, never from client input
