'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { getGeofenceMapDataAction } from '@/app/(main)/geofences/actions';
import type { GeofenceMapData } from '@/data/geofences';

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

export function GeofenceMapDialog({ open, geofenceId, geofenceName, onClose }: Props) {
  const [mapData, setMapData] = useState<GeofenceMapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !geofenceId) {
      setMapData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getGeofenceMapDataAction({ id: geofenceId }).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMapData(result.data ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [open, geofenceId]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Geofence Map — {geofenceName}</DialogTitle>
        </DialogHeader>

        <div className="mt-2">
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
              <GeofenceMap data={mapData} />
              {mapData.assets.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  No assets assigned to this geofence.
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
