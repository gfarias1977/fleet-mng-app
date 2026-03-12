# 00 — Project Setup: Next.js 16 + shadcn/ui

> **Note:** The project scaffold already exists. This document is a reference for the stack and conventions used.

---

## Stack

| Layer | Target |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript 5 |
| UI Library | shadcn/ui (Radix UI + Tailwind) |
| Styling | Tailwind CSS v4 (CSS-based config in `app/globals.css`) |
| Auth | Clerk (`@clerk/nextjs` v7) |
| Database | Neon Serverless Postgres via `@neondatabase/serverless` |
| ORM | Drizzle ORM |
| Forms | React Hook Form + Zod + `@hookform/resolvers` |
| Icons | `lucide-react` |

---

## shadcn/ui configuration

The project uses the **"new-york"** style with **slate** as the base color. Do not re-run `shadcn init` — it is already configured in `components.json`.

To add new shadcn components:

```bash
npx shadcn add <component-name>
```

Current shadcn config (`components.json`): style = `new-york`, baseColor = `slate`, CSS variables enabled, `lucide-react` as the icon library, `@/` alias pointing to project root.

---

## Folder structure

```
src/
├── app/                         # Next.js App Router
│   ├── (auth)/                  # Public pages (sign-in, sign-up)
│   └── (dashboard)/             # Authenticated pages
│       ├── layout.tsx           # AppShell (Sidebar + Header)
│       ├── page.tsx             # / → dashboard
│       ├── devices/
│       │   ├── page.tsx
│       │   └── actions.ts
│       ├── assets/
│       │   ├── page.tsx
│       │   └── actions.ts
│       ├── geofences/
│       │   ├── page.tsx
│       │   └── actions.ts
│       └── alerts/
│           ├── page.tsx
│           └── actions.ts
├── db/
│   ├── schema/                  # Drizzle table definitions (one file per entity)
│   │   └── index.ts             # Re-exports all tables
│   └── index.ts                 # Exports `db` client
├── workers/
│   └── mqtt-worker.ts           # Background MQTT consumer
components/
├── ui/                          # shadcn generated components (do not edit)
├── layout/                      # AppShell, Sidebar, Header, PageContainer
└── [module]/                    # Per-module components: devices/, assets/, etc.
data/                            # Data helper functions (one file per entity)
├── devices.ts
├── assets.ts
├── geofences.ts
└── users.ts
lib/
└── utils.ts                     # cn() helper
hooks/                           # Custom hooks
```

---

## Environment variables

Copy `.env.example` to `.env.local`. Required variables:

```bash
# Clerk authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Database
DATABASE_URL=postgres://...          # Neon serverless (production / default)
LOCAL_DATABASE_URL=postgres://...    # Local Postgres (optional)
USE_LOCAL_DB=false                   # Set to "true" to use LOCAL_DATABASE_URL

# MQTT (optional, for the background worker)
MQTT_BROKER_URL=mqtt://...
MQTT_TOPIC=fleet/#
```

---

## Auth guard (proxy.ts)

Next.js 16 uses `proxy.ts` (not `middleware.ts`) for request interception. The Clerk middleware is already configured:

```ts
// proxy.ts
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

Do **not** create a `middleware.ts` file — it will not be picked up by Next.js 16.

---

## Database commands

```bash
npm run db:push       # Apply schema changes locally (dev only)
npm run db:generate   # Generate SQL migration file
npm run db:migrate    # Apply migration to target DB
npm run db:studio     # Open Drizzle Studio
npm run db:seed       # Run seed script
```
