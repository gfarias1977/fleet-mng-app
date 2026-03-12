# 00 — Project Setup: Next.js 14 + shadcn/ui

## Stack

| Layer | Target (Next.js 16.x) |
|---|---|---|
| Framework | Next.js 16 App Router |
| UI Library | shadcn/ui (Radix UI + Tailwind) |
| Styling | Tailwind CSS + CSS variables |
| State | Zustand or TanStack Query |
| Routing | Next.js App Router (file-based) |
| Forms | React Hook Form + Zod |
| i18n | next-intl |
| HTTP | axios (keep) or fetch + TanStack Query |

---

## Scaffold Commands

```bash
npx create-next-app@latest ccv-front --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd ccv-front
npx shadcn@latest init
```

### shadcn/ui init answers
```
Which style? → Default
Which base color? → Indigo  (matches current primary: indigo from MUI theme)
CSS variables? → Yes
```

### Core shadcn components to install upfront

```bash
npx shadcn@latest add button input label select textarea badge
npx shadcn@latest add table
npx shadcn@latest add dialog alert-dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add breadcrumb
npx shadcn@latest add pagination
npx shadcn@latest add form          # React Hook Form integration
npx shadcn@latest add command       # for Combobox / Autocomplete
npx shadcn@latest add popover       # needed by Combobox
npx shadcn@latest add separator
npx shadcn@latest add card
npx shadcn@latest add sonner        # toasts (replaces redux fetchError alerts)
```

---

## Folder Structure

```
src/
├── app/                         # Next.js App Router
│   ├── (auth)/                  # Route group: public pages
│   │   ├── signin/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── update-password/[validCode]/page.tsx
│   ├── (dashboard)/             # Route group: authenticated pages
│   │   ├── layout.tsx           # AppShell (sidebar + header)
│   │   ├── page.tsx             # /  → dashboard / sample page
│   │   ├── change-password/page.tsx
│   │   ├── admin/
│   │   │   ├── users/page.tsx
│   │   │   ├── roles/page.tsx
│   │   │   ├── aplicaciones/page.tsx
│   │   │   ├── proveedores/page.tsx
│   │   │   └── category-managers/page.tsx
│   │   └── applications/
│   │       ├── cartas/page.tsx
│   │       ├── validar-cartas/page.tsx
│   │       └── buscar-cartas/page.tsx
├── components/
│   ├── ui/                      # shadcn generated components (do not edit)
│   ├── layout/                  # AppShell, Sidebar, Header, Breadcrumbs
│   ├── data-table/              # Reusable DataTable system
│   ├── crud/                    # ConfirmDialog, NoRecordFound, ExportButton
│   └── [module]/                # Per-module: cartas/, users/, roles/, etc.
├── lib/
│   ├── axios.ts                 # Axios instance (replaces services/config)
│   ├── auth.ts                  # Auth helpers / JWT
│   └── utils.ts                 # shadcn cn() util + shared helpers
├── hooks/                       # Custom hooks (useDebounce, etc.)
├── store/                       # Zustand stores or TanStack Query config
├── i18n/                        # next-intl messages
└── types/                       # Shared TypeScript types
```

---

## Environment Variables

Copy `.env` pattern as `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8083/
NEXT_PUBLIC_API_KEY=12345
NEXT_PUBLIC_COMPANY_ID=1
NEXT_PUBLIC_COMPANY_NAME="Salcobrand - Portal Cartas Corto Vence"
NEXT_PUBLIC_SITE_KEY=<recaptcha_site_key>
NEXT_PUBLIC_TIMEZONE=America/Santiago
```

`NEXT_PUBLIC_*` in Next.js.

---

## Auth Guard (RestrictedRoute equivalent)

In Next.js App Router, auth protection lives in `proxy.ts`:

```ts
import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware()

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```
