# 10 - Auth Coding Standards

## Provider

**This app uses [Clerk](https://clerk.com) exclusively for authentication.** Do not introduce any other auth library, session management, JWT handling, or credential storage. Clerk owns the entire auth layer.

---

## Setup (already in place — do not duplicate)

### ClerkProvider

`ClerkProvider` is mounted once in `app/layout.tsx` and wraps the entire app. Do not add it anywhere else.

### Proxy / middleware

This app uses Next.js 16, which uses `proxy.ts` instead of `middleware.ts` for request interception. The Clerk middleware is already configured there:

```ts
// proxy.ts
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();
```

Do not create a `middleware.ts` file — it will not be picked up by Next.js 16.

---

## Reading the current user

### In Server Components and data helpers

Always use `auth()` from `@clerk/nextjs/server`. This is the only authoritative source of the current user's identity.

```ts
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  // userId is the Clerk user ID — use it to look up the internal DB user
  const user = await getUserByClerkId(userId);
  ...
}
```

### Bridging Clerk to the internal database user

The internal `users` table stores app-specific data. Always resolve the Clerk ID to an internal user record via a `/data` helper before passing any ID to other data helpers.

> **⚠️ Schema note:** The `users` table (`src/db/schema/users.ts`) does not yet have a `clerkId` column. Before implementing `getUserByClerkId`, add `clerkId: varchar('clerk_id', { length: 100 }).unique()` to the `usersTable` schema and run `npm run db:push`. Until then, user lookup can fall back to matching by `email` from Clerk's `currentUser()`.

```ts
// data/users.ts
import { db } from '@/src/db';
import { usersTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function getUserByClerkId(clerkId: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId))  // requires clerkId column — see note above
    .limit(1);

  return user ?? null;
}
```

Pass the resolved internal `user.id` (bigint) to every other data helper — never the raw Clerk ID string.

### Never trust client-supplied IDs

Never use a user ID from URL params, search params, form data, or request bodies as the basis for data access. Always obtain the user ID from `auth()`.

```ts
// ❌ Wrong — attacker can supply any userId in the URL
export default async function Page({ params }) {
  const data = await getDevices(params.userId);
}

// ✅ Correct — identity comes from the server-side session only
export default async function Page() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');
  const user = await getUserByClerkId(clerkId);
  const data = await getDevices(user.id);
}
```

---

## Protecting pages and layouts

Use `auth()` at the top of any Server Component that requires a logged-in user. Redirect unauthenticated users to `/sign-in`.

```ts
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function ProtectedLayout({ children }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  return <>{children}</>;
}
```

For protecting entire route groups (e.g., everything under `app/(dashboard)/`), add the check to the shared `layout.tsx` for that group rather than repeating it in every page.

---

## UI components

Use Clerk's built-in components for all auth-related UI. Do not build custom sign-in forms, user menus, or session controls.

| Purpose | Component |
|---------|-----------|
| Signed-in/signed-out conditional rendering | `<Show when="signed-in">` / `<Show when="signed-out">` |
| Sign-in button or modal | `<SignInButton>` |
| Sign-up button or modal | `<SignUpButton>` |
| User avatar / account menu | `<UserButton>` |
| Full sign-in page | `<SignIn>` |
| Full sign-up page | `<SignUp>` |

```tsx
import { Show, SignInButton, UserButton } from '@clerk/nextjs';

// ✅ Correct
<Show when="signed-out">
  <SignInButton mode="modal" fallbackRedirectUrl="/dashboard" />
</Show>
<Show when="signed-in">
  <UserButton />
</Show>

// ❌ Wrong — never build custom auth UI
<button onClick={() => manualSignIn(email, password)}>Sign in</button>
```

---

## What Clerk handles — do not reimplement

- Password hashing and storage
- Session creation, rotation, and expiry
- OAuth / social login flows
- Multi-factor authentication
- Email verification
- "Forgot password" flows

If you find yourself writing any of the above, stop — Clerk already handles it.

---

## Summary checklist

Before writing any auth-related code, verify:

- [ ] `auth()` from `@clerk/nextjs/server` is used to get the current user in Server Components
- [ ] Unauthenticated users are redirected to `/sign-in`
- [ ] The Clerk ID is resolved to an internal DB user via a `/data` helper before any data access
- [ ] No user ID from URL params or client input is used as an authorization boundary
- [ ] Clerk UI components are used for all auth-facing UI — no custom forms
- [ ] No new `ClerkProvider` instances have been added (only one exists, in `app/layout.tsx`)
- [ ] No `middleware.ts` has been created (this app uses `proxy.ts`)
