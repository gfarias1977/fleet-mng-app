# 08 - Error Handling Coding Standards

## Overview

Error handling uses three distinct mechanisms depending on the error source:

1. **Toast notifications** (sonner) — for Server Action results shown to the user
2. **`error.tsx`** — route-level boundary for unexpected runtime errors
3. **`loading.tsx`** — Suspense fallback for async data loading

---

## Required installation

Before using toast notifications, install sonner if not already present:

```bash
npm install sonner
npx shadcn add sonner
```

Add `<Toaster />` to `app/layout.tsx` once:

```tsx
import { Toaster } from '@/components/ui/sonner';

// inside <body>
<Toaster />
```

---

## 1. Toast notifications for Server Action results

When a Client Component calls a Server Action, always check the result and show a toast:

```tsx
'use client';

import { toast } from 'sonner';
import { createDeviceAction } from './actions';

async function onSubmit(values: FormValues) {
  const result = await createDeviceAction(values);

  if (!result.success) {
    toast.error(result.error);
    return;
  }

  toast.success('Device created successfully.');
  router.push('/devices');
}
```

- Use `toast.error(result.error)` when `result.success === false`
- Use `toast.success(...)` on success
- Never display raw error objects or `JSON.stringify` output to the user

Server Actions must return `{ success: false, error: string }` for expected errors — they must not throw. See `docs/data-mutations.md` for the full return type contract.

---

## 2. `error.tsx` — route boundary for unexpected errors

Create an `error.tsx` file alongside any `page.tsx` that performs data fetching or complex logic. This catches unexpected runtime errors (network failures, unhandled exceptions) that propagate out of Server Components.

### Rules

- Always mark with `'use client'` — required by Next.js
- Place it in the same directory as the `page.tsx` it covers
- Do not use it for validation errors — those are handled via toast

```tsx
// app/(dashboard)/devices/error.tsx
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <p className="text-destructive">Something went wrong.</p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
```

### File placement

```
app/
  (dashboard)/
    devices/
      page.tsx
      error.tsx      ← covers devices/page.tsx
    geofences/
      page.tsx
      error.tsx      ← covers geofences/page.tsx
```

---

## 3. `loading.tsx` — Suspense fallback

Create a `loading.tsx` file alongside any `page.tsx` that fetches data. Next.js automatically wraps the page in a `<Suspense>` boundary and shows this component while the page is loading.

Use shadcn `Skeleton` components to match the expected layout:

```tsx
// app/(dashboard)/devices/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
```

Install Skeleton if not already scaffolded:

```bash
npx shadcn add skeleton
```

---

## When to throw vs. return

| Situation | Approach |
|-----------|----------|
| Validation failure in Server Action | Return `{ success: false, error }` — do not throw |
| Authorization failure (user not found) | Return `{ success: false, error }` — do not throw |
| Unexpected DB error, network failure | Let it throw — `error.tsx` catches it |
| Missing required env variable | Let it throw at startup — not user-facing |

Never use try/catch to silently swallow unexpected errors. Let them propagate to `error.tsx` so the user sees a recovery UI.

---

## Full example — Client Component with toast

```tsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { deleteDeviceAction } from './actions';

export function DeleteDeviceButton({ deviceId }: { deviceId: bigint }) {
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    const result = await deleteDeviceAction({ id: deviceId });
    setPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Device deleted.');
  }

  return (
    <Button variant="destructive" onClick={handleDelete} disabled={pending}>
      {pending ? 'Deleting…' : 'Delete'}
    </Button>
  );
}
```

---

## Checklist

Before shipping any feature, verify:

- [ ] `sonner` is installed and `<Toaster />` is in `app/layout.tsx`
- [ ] Every Server Action call checks `result.success` and shows a toast for both outcomes
- [ ] An `error.tsx` exists alongside every `page.tsx` that does data fetching
- [ ] Every `error.tsx` is marked `'use client'`
- [ ] A `loading.tsx` with `Skeleton` components exists for pages with async data
- [ ] No validation/auth errors are thrown from Server Actions — they return `{ success: false, error }`
- [ ] Unexpected errors are allowed to propagate (no silent catch blocks)
