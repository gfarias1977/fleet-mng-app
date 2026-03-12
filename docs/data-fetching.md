# Data Fetching Standards

## Server components only

**All data fetching must be done exclusively in React Server Components.**

Do not fetch data in:
- Route handlers (`app/api/*/route.ts`)
- Client components (`'use client'`)
- `useEffect` hooks
- Third-party client-side fetching libraries (SWR, React Query, etc.)

Every page, layout, or component that needs data must be a Server Component. Pass data down as props to any Client Components that need it for interactivity.

```tsx
// ✅ Correct — Server Component fetches, passes props to client child
// app/devices/page.tsx
import { getDevices } from '@/data/devices';
import { DeviceList } from '@/components/device-list';

export default async function DevicesPage() {
  const devices = await getDevices();
  return <DeviceList devices={devices} />;
}

// ❌ Wrong — never fetch in a client component
'use client';
export function DeviceList() {
  const [devices, setDevices] = useState([]);
  useEffect(() => { fetch('/api/devices').then(...) }, []);
}

// ❌ Wrong — never fetch in a route handler for UI data
// app/api/devices/route.ts
export async function GET() {
  const devices = await db.select()...
}
```

---

## Data helpers in `/data`

**All database queries must be written as helper functions inside the `/data` directory.**

- One file per domain entity (e.g., `data/devices.ts`, `data/geofences.ts`, `data/alerts.ts`)
- Each function performs a single, well-named query
- Helper functions are called only from Server Components

```ts
// ✅ Correct — data/devices.ts
import { db } from '@/src/db';
import { devicesTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function getDevices(userId: bigint) {
  return db
    .select()
    .from(devicesTable)
    .where(eq(devicesTable.userId, userId));
}

// ❌ Wrong — raw SQL is never permitted
const devices = await db.execute(sql`SELECT * FROM devices WHERE user_id = ${userId}`);

// ❌ Wrong — queries do not belong in page or component files
// app/devices/page.tsx
const devices = await db.select().from(devicesTable)...
```

---

## User data isolation

**A logged-in user must only ever be able to access their own data. This is non-negotiable.**

Every data helper that returns user-owned records must:

1. Accept the current user's ID as a parameter
2. Filter every query with a `userId` condition
3. Never return records belonging to another user

The calling Server Component is responsible for obtaining the authenticated user ID (via Clerk's `auth()`) and passing it to the helper. **Never pass an arbitrary user ID from URL params, search params, or request bodies directly into a data helper without first verifying it matches the authenticated user.**

```tsx
// ✅ Correct — auth() is the source of truth for the user ID
import { auth } from '@clerk/nextjs/server';
import { getUserByClerkId } from '@/data/users';
import { getDevices } from '@/data/devices';

export default async function DevicesPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');

  const user = await getUserByClerkId(clerkId);
  const devices = await getDevices(user.id); // scoped to this user only
  ...
}

// ✅ Correct — data helper always filters by userId
// data/devices.ts
export async function getDevices(userId: bigint) {
  return db
    .select()
    .from(devicesTable)
    .where(eq(devicesTable.userId, userId));
}

// ❌ Wrong — unscoped query; exposes every user's devices
export async function getDevices() {
  return db.select().from(devicesTable);
}

// ❌ Wrong — trusting an ID from the URL without auth verification
export default async function DevicePage({ params }) {
  const devices = await getDevices(params.userId); // attacker can supply any ID
}
```

---

## Summary checklist

Before writing any data access code, verify:

- [ ] Data is fetched in a Server Component
- [ ] The query lives in a `/data` helper function
- [ ] Drizzle ORM is used — no raw SQL
- [ ] The query is scoped to the authenticated user's ID obtained from `auth()`
- [ ] No user-supplied IDs (URL params, form data) are used as the authorization boundary
