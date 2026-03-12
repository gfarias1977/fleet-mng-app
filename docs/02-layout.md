# 02 — Page Layout: AppShell, Sidebar, Header, PageContainer

## AppShell (dashboard layout)

Wraps all authenticated pages. Lives at `src/app/(dashboard)/layout.tsx`.

```
┌─────────────────────────────────────────────┐
│  Header (topbar)                            │
├────────────┬────────────────────────────────┤
│            │                                │
│  Sidebar   │   <children>                   │
│  (nav)     │   PageContainer                │
│            │     Breadcrumbs                │
│            │     content                    │
│            │                                │
└────────────┴────────────────────────────────┘
```

```tsx
// src/app/(dashboard)/layout.tsx
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## Sidebar Component

Nav items defined per route group.

```tsx
// src/components/layout/Sidebar.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Cpu,
  BoxSelect,
  MapPin,
  Bell,
} from 'lucide-react';

const nav = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  {
    group: 'Fleet',
    items: [
      { label: 'Devices', href: '/devices', icon: Cpu },
      { label: 'Assets', href: '/assets', icon: BoxSelect },
      { label: 'Geofences', href: '/geofences', icon: MapPin },
      { label: 'Alerts', href: '/alerts', icon: Bell },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 bg-sidebar-bg border-r border-border/10 flex flex-col overflow-y-auto">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border/10">
        <span className="font-bold text-primary text-lg">Fleet Manager</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {nav.map((item) => {
          if ('href' in item) {
            return <NavItem key={item.href} {...item} active={pathname === item.href} />;
          }
          return (
            <div key={item.group}>
              <p className="px-3 py-2 text-xs font-semibold text-sidebar-text/50 uppercase tracking-wider">
                {item.group}
              </p>
              {item.items.map((sub) => (
                <NavItem key={sub.href} {...sub} active={pathname.startsWith(sub.href)} />
              ))}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function NavItem({
  label, href, icon: Icon, active,
}: { label: string; href: string; icon: React.ElementType; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
        active
          ? 'bg-sidebar-active-bg text-sidebar-text-active font-medium'
          : 'text-sidebar-text hover:bg-sidebar-hover',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}
```

---

## Header Component

Topbar with Clerk's `UserButton` for the user account menu.

```tsx
// src/components/layout/Header.tsx
import { UserButton } from '@clerk/nextjs';

export function Header() {
  return (
    <header className="h-16 border-b border-border/10 bg-card flex items-center justify-between px-6 shrink-0">
      <div /> {/* breadcrumbs injected per page via PageContainer */}

      <div className="flex items-center gap-2">
        <UserButton />
      </div>
    </header>
  );
}
```

Do not build a custom user menu or theme toggle in the Header. Use Clerk's `UserButton` for the account menu (see `docs/10-auth.md`).

---

## PageContainer Component

Wraps every page with an optional heading and breadcrumbs.

```tsx
// src/components/layout/PageContainer.tsx
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import React from 'react';

type BreadcrumbEntry = { label: React.ReactNode; href?: string };

interface PageContainerProps {
  heading?: React.ReactNode;
  breadcrumbs?: BreadcrumbEntry[];
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ heading, breadcrumbs, children, className }: PageContainerProps) {
  return (
    <div className={className}>
      {(heading || breadcrumbs) && (
        <div className="mb-6">
          {heading && <h1 className="text-h1 text-foreground mb-2">{heading}</h1>}
          {breadcrumbs && (
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {crumb.href ? (
                        <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
```

### Usage

```tsx
import { PageContainer } from '@/components/layout/PageContainer';
import { DevicesModule } from '@/components/devices/DevicesModule';

export default function DevicesPage() {
  return (
    <PageContainer
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Devices' },
      ]}
    >
      <DevicesModule />
    </PageContainer>
  );
}
```

---

## GridContainer

Just a Tailwind grid wrapper.

```tsx
import { cn } from '@/lib/utils';

export function GridContainer({
  children,
  className,
  cols = 12,
}: {
  children: React.ReactNode;
  className?: string;
  cols?: number;
}) {
  return (
    <div className={cn('grid grid-cols-12 gap-6', className)}>
      {children}
    </div>
  );
}
```
