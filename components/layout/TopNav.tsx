'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import {
  AlertTriangle,
  Activity,
  Bell,
  BellRing,
  ChevronDown,
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
  ArrowUp,
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
import { useLanguage } from '@/hooks/use-language';
import { SidebarPosition } from '@/components/layout/AppShell';

interface TopNavProps {
  position: 'top';
  onPositionChange: (position: SidebarPosition) => void;
}

const positionIcons: Record<SidebarPosition, React.ReactNode> = {
  left: <AlignLeft className="h-4 w-4" />,
  top: <ArrowUp className="h-4 w-4" />,
};

const navGroups = [
  {
    labelKey: 'nav.group.alerts' as const,
    icon: Bell,
    items: [
      { labelKey: 'nav.alerts' as const, href: '/alerts', icon: AlertTriangle },
      { labelKey: 'nav.alertTypes' as const, href: '/alert-types', icon: Tag },
      { labelKey: 'nav.alertNotifications' as const, href: '/alert-notifications', icon: BellRing },
    ],
  },
  {
    labelKey: 'nav.group.assets' as const,
    icon: Package,
    items: [
      { labelKey: 'nav.assets' as const, href: '/assets', icon: Package },
      { labelKey: 'nav.assetTypes' as const, href: '/asset-types', icon: FolderOpen },
      { labelKey: 'nav.assetGeofenceAssignments' as const, href: '/asset-geofence-assignments', icon: MapPinned },
    ],
  },
  {
    labelKey: 'nav.group.devices' as const,
    icon: Cpu,
    items: [
      { labelKey: 'nav.devices' as const, href: '/devices', icon: Cpu },
      { labelKey: 'nav.deviceTypes' as const, href: '/device-types', icon: Layers },
      { labelKey: 'nav.deviceSensors' as const, href: '/device-sensors', icon: Gauge },
      { labelKey: 'nav.deviceLocationHistory' as const, href: '/device-location-history', icon: History },
    ],
  },
  {
    labelKey: 'nav.group.geofences' as const,
    icon: MapPin,
    items: [
      { labelKey: 'nav.geofences' as const, href: '/geofences', icon: MapPin },
      { labelKey: 'nav.geofenceTypes' as const, href: '/geofence-types', icon: Map },
      { labelKey: 'nav.geofenceAlertRules' as const, href: '/geofence-alert-rules', icon: ShieldAlert },
    ],
  },
  {
    labelKey: 'nav.group.sensors' as const,
    icon: Activity,
    items: [
      { labelKey: 'nav.sensors' as const, href: '/sensors', icon: Activity },
      { labelKey: 'nav.sensorTypes' as const, href: '/sensor-types', icon: Settings2 },
    ],
  },
  {
    labelKey: 'nav.group.telemetry' as const,
    icon: Radio,
    items: [
      { labelKey: 'nav.telemetryEvents' as const, href: '/telemetry-events', icon: Radio },
    ],
  },
  {
    labelKey: 'nav.group.administration' as const,
    icon: Users,
    items: [
      { labelKey: 'nav.users' as const, href: '/users', icon: User },
    ],
  },
];

export function TopNav({ position, onPositionChange }: TopNavProps) {
  const pathname = usePathname();
  const { t, language, setLanguage } = useLanguage();
  const positions: SidebarPosition[] = ['left', 'top'];

  return (
    <nav className="flex items-center border-b bg-background px-4 h-14 shrink-0 gap-4 overflow-x-auto">
      <span className="font-semibold text-sm shrink-0 mr-2">{t('app.name')}</span>

      <div className="flex items-center gap-1 flex-1 overflow-x-auto">
        {navGroups.map((group) => {
          const anyItemActive = group.items.some(
            (item) => pathname === item.href || pathname.startsWith(item.href + '/')
          );
          return (
            <DropdownMenu key={group.labelKey}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={anyItemActive ? 'default' : 'ghost'}
                  size="sm"
                  className="shrink-0 h-8 gap-1"
                >
                  <group.icon className="h-3.5 w-3.5" />
                  {t(group.labelKey)}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <DropdownMenuItem
                      key={item.href}
                      asChild
                      className={isActive ? 'bg-accent' : ''}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4 mr-2" />
                        {t(item.labelKey)}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
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
