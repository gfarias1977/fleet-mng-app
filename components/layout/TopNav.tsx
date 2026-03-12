'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import {
  AlertTriangle,
  Activity,
  Bell,
  BellRing,
  Cpu,
  FolderOpen,
  Gauge,
  History,
  Layers,
  Map,
  MapPin,
  MapPinned,
  Package,
  Radio,
  Settings2,
  ShieldAlert,
  Tag,
  User,
  Users,
  AlignLeft,
  AlignRight,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/use-language';
import { SidebarPosition } from '@/components/layout/AppShell';

interface TopNavProps {
  position: 'top' | 'bottom';
  onPositionChange: (position: SidebarPosition) => void;
}

const positionIcons: Record<SidebarPosition, React.ReactNode> = {
  left: <AlignLeft className="h-4 w-4" />,
  right: <AlignRight className="h-4 w-4" />,
  top: <ArrowUp className="h-4 w-4" />,
  bottom: <ArrowDown className="h-4 w-4" />,
};

const navLinks = [
  { labelKey: 'nav.alerts' as const, href: '/alerts', icon: AlertTriangle },
  { labelKey: 'nav.assets' as const, href: '/assets', icon: Package },
  { labelKey: 'nav.devices' as const, href: '/devices', icon: Cpu },
  { labelKey: 'nav.geofences' as const, href: '/geofences', icon: MapPin },
  { labelKey: 'nav.sensors' as const, href: '/sensors', icon: Activity },
  { labelKey: 'nav.telemetryEvents' as const, href: '/telemetry-events', icon: Radio },
  { labelKey: 'nav.users' as const, href: '/users', icon: Users },
];

export function TopNav({ position, onPositionChange }: TopNavProps) {
  const pathname = usePathname();
  const { t, language, setLanguage } = useLanguage();
  const positions: SidebarPosition[] = ['left', 'right', 'top', 'bottom'];

  return (
    <nav className="flex items-center border-b bg-background px-4 h-14 shrink-0 gap-4 overflow-x-auto">
      <span className="font-semibold text-sm shrink-0 mr-2">{t('app.name')}</span>

      <div className="flex items-center gap-1 flex-1 overflow-x-auto">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <Button
              key={link.href}
              asChild
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              className="shrink-0 h-8"
            >
              <Link href={link.href}>
                <link.icon className="h-3.5 w-3.5 mr-1" />
                {t(link.labelKey)}
              </Link>
            </Button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center border rounded-md overflow-hidden">
          <Button
            variant={language === 'en' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 rounded-none px-2 text-xs"
            onClick={() => setLanguage('en')}
          >
            EN
          </Button>
          <Button
            variant={language === 'es' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 rounded-none px-2 text-xs"
            onClick={() => setLanguage('es')}
          >
            ES
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              {positionIcons[position]}
              <span className="sr-only">{t('header.sidebarPosition')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('header.sidebarPosition')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {positions.map((pos) => (
              <DropdownMenuItem
                key={pos}
                onClick={() => onPositionChange(pos)}
                className={position === pos ? 'bg-accent' : ''}
              >
                <span className="mr-2">{positionIcons[pos]}</span>
                {t(`header.position.${pos}` as Parameters<typeof t>[0])}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <UserButton />
      </div>
    </nav>
  );
}
