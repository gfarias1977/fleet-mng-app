# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Docs-first rule

**Before generating any code, always check the `/docs` directory for a relevant standards file and follow it exactly.**

| Area | File |
|------|------|
| UI components & date formatting | `docs/ui.md` |
| Data fetching, DB queries & user data isolation | `docs/data-fetching.md` |
| Authentication & Clerk usage | `docs/auth.md` |
| Data mutations, Server Actions & Zod validation | `docs/data-mutations.md` |
| Server Components & async params | `docs/server-components.md` |
| Forms (react-hook-form + zod + shadcn) | `docs/forms.md` |
| Error handling (toast, error.tsx, loading.tsx) | `docs/error-handling.md` |
| Database schema, migrations & naming | `docs/database.md` |
| Environment variables | `docs/environment.md` |

If a `docs/` file covers the area you are working in, its rules are mandatory — they override any default behavior or general best practices.

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

### Component conventions

- UI primitives go in `components/ui/` (shadcn-managed)
- Custom components go in `components/`
- Hooks go in `hooks/`
- Server-side utilities and DB logic go in `lib/`


