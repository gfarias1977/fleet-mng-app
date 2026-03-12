# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Docs-first rule

> **MANDATORY: Before writing any code, read the relevant `/docs` file for the area you are working in. Do not generate code first and check docs after. The docs define the only acceptable pattern — no exceptions.**

Use this table to find the right file:

| Area | File |
|------|------|
| UI components & date formatting | `docs/12-ui.md` |
| Data fetching, DB queries & user data isolation | `docs/13-data-fetching.md` |
| Authentication & Clerk usage | `docs/10-auth.md` |
| Data mutations, Server Actions & Zod validation | `docs/14 - data-mutations.md` |
| Server Components & async params | `docs/15 - server-components.md` |
| Forms (react-hook-form + zod + shadcn) | `docs/04-forms.md` |
| Error handling (toast, error.tsx, loading.tsx) | `docs/09-error-handling.md` |
| Database schema, migrations & naming | `docs/11-database.md` |
| Environment variables | `docs/07-environment.md` |

Rules:
- If a `docs/` file covers the area you are working in, **read it before writing a single line of code**.
- The docs override any default behavior, general best practices, or patterns learned from training data.
- If the task spans multiple areas (e.g. a form that calls a Server Action that writes to the DB), read **all** relevant docs files before starting.
- If you are unsure which doc applies, check the `/docs` directory and read the closest match.

## Commands

```bash
npm run dev      # Start development server at http://localhost:3000
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

There is no test runner configured yet.

## Architecture

This is a **Next.js 16 App Router** application using React 19 and TypeScript. The project is in early stages — currently a bootstrapped scaffold with UI tooling set up but no application-specific features implemented yet.

### Key technologies

- **Next.js App Router** — all pages/layouts live under `app/`
- **Tailwind CSS v4** — configured via `app/globals.css` (no `tailwind.config.js`; v4 uses CSS-based config)
- **shadcn/ui** — component library configured in `components.json` with "new-york" style, slate base color, and `lucide-react` icons. Add components via `npx shadcn add <component>`
- **Radix UI** — used as the underlying primitive library for shadcn components
- **Clerk auth** — installed (`@clerk/nextjs` v7); `ClerkProvider` + `Show`/`UserButton` already wired in `app/layout.tsx`
- **Neon Serverless Postgres** — a `neon-postgres` skill is installed at `.agents/skills/neon-postgres/SKILL.md`; use it for any database integration

### Next.js 16 conventions

Next.js 16 uses `proxy.ts` (not `middleware.ts`) for request interception. The `matcher` config syntax is the same.

### Path aliases

`@/` maps to the project root (e.g., `@/components`, `@/lib/utils`, `@/hooks`).

### Utility

`lib/utils.ts` exports `cn()` — a `clsx` + `tailwind-merge` helper for conditional className merging. Use it throughout all components.

### Folder structure

The project separates **Next.js frontend** (project root) from **backend infrastructure** (`src/`):

| Folder | Purpose |
|--------|---------|
| `app/` | Next.js App Router — pages, layouts, Server Actions only. No business logic. |
| `components/ui/` | shadcn-managed primitives — **never edit directly** |
| `components/` | Custom React components (layout, AppShell, Sidebar, etc.) |
| `data/` | Drizzle query/mutation helpers — called only from Server Components and Server Actions, never from Client Components |
| `hooks/` | Custom React hooks (client-side only) |
| `lib/utils.ts` | Only the `cn()` helper — do not add other utilities here |
| `lib/services/` | Pure business logic shared between workers and Server Actions (no HTTP, no Next.js) |
| `src/db/` | Drizzle schema, DB connection factory (`src/db/index.ts`), seed |
| `src/workers/` | Independent Node.js background processes (MQTT, etc.) — not compiled by Next.js |

### Data layer rules

- `data/` helpers are the **only** place for Drizzle queries and mutations.
- Server Actions (in colocated `actions.ts` files) call `data/` helpers — they never write DB logic inline.
- Client Components never import from `data/` directly.


