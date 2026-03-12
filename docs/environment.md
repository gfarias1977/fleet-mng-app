# Environment Variables Standards

## Overview

Environment variables provide credentials and runtime configuration. Follow these rules to keep secrets out of version control and to avoid exposing private values to the browser.

---

## Setup

Copy the required variables into a `.env.local` file at the project root. This file is gitignored and must never be committed.

```bash
# Create your local env file (do not commit this)
cp .env.example .env.local
# → fill in the values from the sources listed below
```

> **Note:** `.env.example` should be created and committed to the repo with placeholder values (no real credentials) so new developers know which variables are required.

---

## Required variables

| Variable | Visibility | Description |
|----------|------------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public | Clerk publishable key — safe to expose to the browser |
| `CLERK_SECRET_KEY` | Private | Clerk secret key — server only |
| `DATABASE_URL` | Private | Neon PostgreSQL connection string |
| `LOCAL_DATABASE_URL` | Private | Local PostgreSQL connection string (dev only) |
| `USE_LOCAL_DB` | Private | Set to `true` to use `LOCAL_DATABASE_URL`; omit or `false` to use `DATABASE_URL` (Neon) |
| `DWELL_THRESHOLD_MS` | Private | Override dwell time for the MQTT worker in milliseconds (default: `60000`) |

---

## Public vs. private variables

`NEXT_PUBLIC_*` variables are **bundled into the client-side JavaScript** and visible to anyone who inspects the browser. Only variables that are explicitly safe to expose publicly should use this prefix.

In this project, only `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is public. All other variables are private.

```ts
// ✅ OK in a Client Component — public variable
const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// ❌ Never in a Client Component — private variable exposed to browser
const dbUrl = process.env.DATABASE_URL;
```

Private variables are only available in:
- Server Components
- Server Actions (`'use server'`)
- Route Handlers (`app/api/`)
- Workers and scripts run server-side

---

## Security rules

- **Never commit `.env.local` or any file containing real credentials.** The `.gitignore` already excludes it.
- **Never read private variables inside Client Components** (`'use client'` files).
- **Never log private variable values**, even in development.
- Create `.env.example` with placeholder values and commit it so the team knows which variables are needed.

---

## Where to get each variable

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | [Clerk Dashboard](https://dashboard.clerk.com) → your app → API Keys |
| `CLERK_SECRET_KEY` | [Clerk Dashboard](https://dashboard.clerk.com) → your app → API Keys |
| `DATABASE_URL` | [Neon Console](https://console.neon.tech) → your project → Connection Details → connection string |
| `LOCAL_DATABASE_URL` | Your local Postgres instance (e.g., `postgresql://user:pass@localhost:5432/fleet_dev`) |
| `USE_LOCAL_DB` | Set manually in `.env.local` (`true` or `false`) |
| `DWELL_THRESHOLD_MS` | Set manually in `.env.local` (optional; defaults to `60000`) |

---

## Checklist

Before deploying or onboarding a new developer, verify:

- [ ] `.env.example` exists in the repo with placeholder values for all required variables
- [ ] `.env.local` is present locally with real values and is listed in `.gitignore`
- [ ] No private variables are read inside `'use client'` components
- [ ] No `.env` file with real credentials is committed to version control
- [ ] `USE_LOCAL_DB` is set appropriately for the current environment (`true` for local dev, absent/`false` for Neon)
