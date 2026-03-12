'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
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
} from 'lucide-react';
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';

interface NavItem {
  labelKey: Parameters<ReturnType<typeof useLanguage>['t']>[0];
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  labelKey: Parameters<ReturnType<typeof useLanguage>['t']>[0];
  icon: React.ElementType;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    labelKey: 'nav.group.alerts',
    icon: Bell,
    items: [
      { labelKey: 'nav.alerts', href: '/alerts', icon: AlertTriangle },
      { labelKey: 'nav.alertTypes', href: '/alert-types', icon: Tag },
      { labelKey: 'nav.alertNotifications', href: '/alert-notifications', icon: BellRing },
    ],
  },
  {
    labelKey: 'nav.group.assets',
    icon: Package,
    items: [
      { labelKey: 'nav.assets', href: '/assets', icon: Package },
      { labelKey: 'nav.assetTypes', href: '/asset-types', icon: FolderOpen },
      { labelKey: 'nav.assetGeofenceAssignments', href: '/asset-geofence-assignments', icon: MapPinned },
    ],
  },
  {
    labelKey: 'nav.group.devices',
    icon: Cpu,
    items: [
      { labelKey: 'nav.devices', href: '/devices', icon: Cpu },
      { labelKey: 'nav.deviceTypes', href: '/device-types', icon: Layers },
      { labelKey: 'nav.deviceSensors', href: '/device-sensors', icon: Gauge },
      { labelKey: 'nav.deviceLocationHistory', href: '/device-location-history', icon: History },
    ],
  },
  {
    labelKey: 'nav.group.geofences',
    icon: MapPin,
    items: [
      { labelKey: 'nav.geofences', href: '/geofences', icon: MapPin },
      { labelKey: 'nav.geofenceTypes', href: '/geofence-types', icon: Map },
      { labelKey: 'nav.geofenceAlertRules', href: '/geofence-alert-rules', icon: ShieldAlert },
    ],
  },
  {
    labelKey: 'nav.group.sensors',
    icon: Activity,
    items: [
      { labelKey: 'nav.sensors', href: '/sensors', icon: Activity },
      { labelKey: 'nav.sensorTypes', href: '/sensor-types', icon: Settings2 },
    ],
  },
  {
    labelKey: 'nav.group.telemetry',
    icon: Radio,
    items: [
      { labelKey: 'nav.telemetryEvents', href: '/telemetry-events', icon: Radio },
    ],
  },
  {
    labelKey: 'nav.group.administration',
    icon: Users,
    items: [
      { labelKey: 'nav.users', href: '/users', icon: User },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <ShadcnSidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <Radio className="h-5 w-5 shrink-0 text-primary" />
          <span className="font-semibold text-sm truncate">{t('app.name')}</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => {
          const anyItemActive = group.items.some(
            (item) => pathname === item.href || pathname.startsWith(item.href + '/')
          );
          return (
            <Collapsible key={group.labelKey} defaultOpen={anyItemActive}>
              <SidebarGroup>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center justify-between [&[data-state=open]>svg:last-child]:rotate-180">
                    <span className="flex items-center gap-1">
                      <group.icon className="h-3.5 w-3.5" />
                      {t(group.labelKey)}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            asChild
                            isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                            tooltip={t(item.labelKey)}
                          >
                            <Link href={item.href}>
                              <item.icon />
                              <span>{t(item.labelKey)}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>

      <SidebarFooter />
    </ShadcnSidebar>
  );
}
