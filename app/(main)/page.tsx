'use client';

import Link from 'next/link';
import { AlertTriangle, Cpu, MapPin, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/PageContainer';
import { useLanguage } from '@/hooks/use-language';

const stats = [
  { labelKey: 'welcome.stats.assets' as const, value: '—', icon: Package },
  { labelKey: 'welcome.stats.devices' as const, value: '—', icon: Cpu },
  { labelKey: 'welcome.stats.geofences' as const, value: '—', icon: MapPin },
  { labelKey: 'welcome.stats.activeAlerts' as const, value: '—', icon: AlertTriangle },
];

const quickLinks = [
  { labelKey: 'welcome.viewAssets' as const, href: '/assets', icon: Package },
  { labelKey: 'welcome.viewDevices' as const, href: '/devices', icon: Cpu },
  { labelKey: 'welcome.viewGeofences' as const, href: '/geofences', icon: MapPin },
  { labelKey: 'welcome.viewAlerts' as const, href: '/alerts', icon: AlertTriangle },
];

export default function WelcomePage() {
  const { t } = useLanguage();

  return (
    <PageContainer
      heading={t('welcome.heading')}
      breadcrumbs={[{ label: t('app.name'), href: '/' }]}
    >
      <p className="text-muted-foreground">{t('welcome.subtitle')}</p>
      <p className="text-sm text-muted-foreground -mt-4">{t('welcome.description')}</p>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.labelKey}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t(stat.labelKey)}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-base font-semibold mb-3">{t('welcome.quickLinks')}</h2>
        <div className="flex flex-wrap gap-2">
          {quickLinks.map((link) => (
            <Button key={link.href} asChild variant="outline">
              <Link href={link.href}>
                <link.icon className="h-4 w-4 mr-2" />
                {t(link.labelKey)}
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
