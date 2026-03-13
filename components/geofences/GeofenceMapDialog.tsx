'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Bell, BellDot, LocateFixed } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  getGeofenceMapDataAction,
  getAlertsForAssetAction,
  getNotificationsForAssetAction,
} from '@/app/(main)/geofences/actions';
import type { GeofenceMapData } from '@/data/geofences';
import type { AlertRow, NotificationRow } from '@/data/alerts';

// Dynamically import Leaflet map – no SSR
const GeofenceMap = dynamic(() => import('./GeofenceMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />,
});

interface Props {
  open: boolean;
  geofenceId: string | null;
  geofenceName: string;
  onClose: () => void;
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

function SeverityBadge({ value }: { value: number | null | undefined }) {
  const n = value ?? 1;
  const variant = n >= 4 ? 'destructive' : n >= 2 ? 'secondary' : 'outline';
  return <Badge variant={variant}>{n}</Badge>;
}

export function GeofenceMapDialog({ open, geofenceId, geofenceName, onClose }: Props) {
  const [mapData, setMapData] = useState<GeofenceMapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flyToAsset, setFlyToAsset] = useState<{ lat: number; lng: number } | null>(null);

  // Alerts sheet
  const [alertsSheet, setAlertsSheet] = useState<{ assetId: number; assetName: string } | null>(null);
  const [alertRows, setAlertRows] = useState<AlertRow[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // Notifications sheet
  const [notifSheet, setNotifSheet] = useState<{ assetId: number; assetName: string } | null>(null);
  const [notifRows, setNotifRows] = useState<NotificationRow[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  // Load map data
  useEffect(() => {
    if (!open || !geofenceId) {
      setMapData(null);
      setError(null);
      setFlyToAsset(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setFlyToAsset(null);

    getGeofenceMapDataAction({ id: geofenceId }).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMapData(result.data ?? null);
    });

    return () => { cancelled = true; };
  }, [open, geofenceId]);

  // Load alerts when sheet opens
  useEffect(() => {
    if (!alertsSheet || !geofenceId) {
      setAlertRows([]);
      return;
    }

    let cancelled = false;
    setAlertsLoading(true);

    getAlertsForAssetAction({
      assetId: String(alertsSheet.assetId),
      geofenceId: geofenceId,
    }).then((result) => {
      if (cancelled) return;
      setAlertsLoading(false);
      if (result.success) setAlertRows(result.data);
    });

    return () => { cancelled = true; };
  }, [alertsSheet, geofenceId]);

  // Load notifications when sheet opens
  useEffect(() => {
    if (!notifSheet || !geofenceId) {
      setNotifRows([]);
      return;
    }

    let cancelled = false;
    setNotifLoading(true);

    getNotificationsForAssetAction({
      assetId: String(notifSheet.assetId),
      geofenceId: geofenceId,
    }).then((result) => {
      if (cancelled) return;
      setNotifLoading(false);
      if (result.success) setNotifRows(result.data);
    });

    return () => { cancelled = true; };
  }, [notifSheet, geofenceId]);

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Geofence Map — {geofenceName}</DialogTitle>
          </DialogHeader>

          <div className="mt-2 space-y-4">
            {loading && <Skeleton className="h-[400px] w-full" />}
            {error && (
              <div className="flex items-center justify-center h-32 text-destructive text-sm">
                {error}
              </div>
            )}
            {!loading && !error && mapData === null && (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No map data available for this geofence.
              </div>
            )}
            {!loading && !error && mapData !== null && (
              <>
                <GeofenceMap data={mapData} flyToAsset={flyToAsset} />

                {mapData.assets.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center">
                    No assets assigned to this geofence.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>Serial</TableHead>
                        <TableHead>Sensors</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mapData.assets.map((asset) => (
                        <TableRow key={asset.id}>
                          <TableCell className="font-medium">{asset.number}</TableCell>
                          <TableCell>{asset.deviceName}</TableCell>
                          <TableCell className="text-muted-foreground text-xs font-mono">{asset.deviceSerialNumber}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {asset.sensors.map((s) => s.name).join(', ') || '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="View Alerts"
                                onClick={() => setAlertsSheet({ assetId: asset.id, assetName: asset.number })}
                              >
                                <Bell className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="View Notifications"
                                onClick={() => setNotifSheet({ assetId: asset.id, assetName: asset.number })}
                              >
                                <BellDot className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Center on asset"
                                onClick={() => setFlyToAsset({ lat: parseFloat(asset.lastLat), lng: parseFloat(asset.lastLng) })}
                              >
                                <LocateFixed className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Alerts Sheet */}
      <Sheet open={alertsSheet !== null} onOpenChange={(v) => { if (!v) setAlertsSheet(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Alerts — {alertsSheet?.assetName ?? ''}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {alertsLoading && (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            )}
            {!alertsLoading && alertRows.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No alerts found for this asset and geofence.</p>
            )}
            {!alertsLoading && alertRows.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertRows.map((row) => (
                    <TableRow key={String(row.id)}>
                      <TableCell className="text-xs whitespace-nowrap">{formatDate(row.alertTimestamp)}</TableCell>
                      <TableCell className="text-xs">{row.typeName}</TableCell>
                      <TableCell><SeverityBadge value={row.severity} /></TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{row.message ?? '—'}</TableCell>
                      <TableCell className="text-xs">{row.status ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Notifications Sheet */}
      <Sheet open={notifSheet !== null} onOpenChange={(v) => { if (!v) setNotifSheet(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Notifications — {notifSheet?.assetName ?? ''}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {notifLoading && (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            )}
            {!notifLoading && notifRows.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No notifications found for this asset and geofence.</p>
            )}
            {!notifLoading && notifRows.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifRows.map((row) => (
                    <TableRow key={String(row.id)}>
                      <TableCell className="text-xs whitespace-nowrap">{formatDate(row.sentAt)}</TableCell>
                      <TableCell className="text-xs">{row.notificationMethod ?? '—'}</TableCell>
                      <TableCell className="text-xs max-w-[160px] truncate">{row.destination ?? '—'}</TableCell>
                      <TableCell className="text-xs max-w-[180px] truncate">{row.subject ?? '—'}</TableCell>
                      <TableCell className="text-xs">{row.status ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
