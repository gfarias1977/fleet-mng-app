'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { format } from 'date-fns';
import type { GeofenceMapData } from '@/data/geofences';

// Fix Leaflet default icon issue with Webpack/Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Props {
  data: GeofenceMapData;
}

export default function GeofenceMap({ data }: Props) {
  const { geofence, assets } = data;
  const centerLat = parseFloat(geofence.centerLatitude);
  const centerLng = parseFloat(geofence.centerLongitude);
  const radiusM = parseFloat(geofence.radiusMeters);

  // Zoom level estimation from radius
  const zoom = radiusM > 50000 ? 8 : radiusM > 10000 ? 10 : radiusM > 1000 ? 13 : 15;

  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={zoom}
      style={{ height: '400px', width: '100%', borderRadius: '0.375rem' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Geofence circle */}
      <Circle
        center={[centerLat, centerLng]}
        radius={radiusM}
        pathOptions={{ color: 'hsl(215, 100%, 50%)', fillOpacity: 0.1 }}
      />

      {/* Asset markers */}
      {assets.map((asset) => (
        <Marker
          key={asset.id}
          position={[parseFloat(asset.lastLat), parseFloat(asset.lastLng)]}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{asset.number}</p>
              <p className="text-muted-foreground text-xs">
                {format(new Date(asset.lastTimestamp), 'do MMM yyyy, HH:mm')}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
