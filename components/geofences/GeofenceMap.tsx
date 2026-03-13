'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Polygon, Rectangle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeofenceMapData } from '@/data/geofences';

// Fix Leaflet default icon issue with Webpack/Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ---------------------------------------------------------------------------
// FitBounds component for polygon / rectangle
// ---------------------------------------------------------------------------

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [40, 40] });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// ---------------------------------------------------------------------------
// FlyToAsset component
// ---------------------------------------------------------------------------

function FlyToAsset({ target }: { target: { lat: number; lng: number } | null | undefined }) {
  const map = useMap();
  const prevRef = useRef<typeof target>(null);

  useEffect(() => {
    if (!target) return;
    if (prevRef.current?.lat === target.lat && prevRef.current?.lng === target.lng) return;
    prevRef.current = target;
    map.flyTo([target.lat, target.lng], 16);
  }, [target, map]);

  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  data: GeofenceMapData;
  flyToAsset?: { lat: number; lng: number } | null;
}

export default function GeofenceMap({ data, flyToAsset }: Props) {
  const { geofence, assets } = data;
  const { geometry } = geofence;

  // Compute initial map center and zoom
  let center: [number, number] = [20, 0];
  let zoom = 2;
  let fitBounds: L.LatLngBoundsExpression | null = null;

  if (geometry?.type === 'circular') {
    const lat = parseFloat(geometry.centerLatitude);
    const lng = parseFloat(geometry.centerLongitude);
    const radiusM = parseFloat(geometry.radiusMeters);
    center = [lat, lng];
    zoom = radiusM > 50000 ? 8 : radiusM > 10000 ? 10 : radiusM > 1000 ? 13 : 15;
  } else if (geometry?.type === 'polygon' && geometry.points.length > 0) {
    const lats = geometry.points.map((p) => parseFloat(p.latitude));
    const lngs = geometry.points.map((p) => parseFloat(p.longitude));
    center = [
      (Math.min(...lats) + Math.max(...lats)) / 2,
      (Math.min(...lngs) + Math.max(...lngs)) / 2,
    ];
    zoom = 13;
    fitBounds = geometry.points.map((p) => [parseFloat(p.latitude), parseFloat(p.longitude)]) as [number, number][];
  } else if (geometry?.type === 'rectangular') {
    const nwLat = parseFloat(geometry.nwLatitude);
    const nwLng = parseFloat(geometry.nwLongitude);
    const seLat = parseFloat(geometry.seLatitude);
    const seLng = parseFloat(geometry.seLongitude);
    center = [(nwLat + seLat) / 2, (nwLng + seLng) / 2];
    zoom = 13;
    fitBounds = [[nwLat, nwLng], [seLat, seLng]];
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '400px', width: '100%', borderRadius: '0.375rem' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {fitBounds && <FitBounds bounds={fitBounds} />}
      <FlyToAsset target={flyToAsset} />

      {/* Circular geofence */}
      {geometry?.type === 'circular' && (
        <Circle
          center={[parseFloat(geometry.centerLatitude), parseFloat(geometry.centerLongitude)]}
          radius={parseFloat(geometry.radiusMeters)}
          pathOptions={{ color: 'hsl(215, 100%, 50%)', fillOpacity: 0.1 }}
        />
      )}

      {/* Polygon geofence */}
      {geometry?.type === 'polygon' && geometry.points.length >= 3 && (
        <Polygon
          positions={geometry.points.map((p) => [parseFloat(p.latitude), parseFloat(p.longitude)] as [number, number])}
          pathOptions={{ color: 'hsl(142, 76%, 36%)', fillOpacity: 0.15 }}
        />
      )}

      {/* Rectangular geofence */}
      {geometry?.type === 'rectangular' && (
        <Rectangle
          bounds={[
            [parseFloat(geometry.nwLatitude), parseFloat(geometry.nwLongitude)],
            [parseFloat(geometry.seLatitude), parseFloat(geometry.seLongitude)],
          ]}
          pathOptions={{ color: 'hsl(38, 92%, 50%)', fillOpacity: 0.15 }}
        />
      )}

      {/* Asset markers */}
      {assets.map((asset) => (
        <Marker
          key={asset.id}
          position={[parseFloat(asset.lastLat), parseFloat(asset.lastLng)]}
          eventHandlers={{
            mouseover: (e) => e.target.openPopup(),
            mouseout: (e) => e.target.closePopup(),
          }}
        >
          <Popup>
            <div className="text-sm space-y-0.5">
              <p className="font-semibold">{asset.number}</p>
              <p className="text-xs text-muted-foreground">SN: {asset.deviceSerialNumber}</p>
              <p className="text-xs text-muted-foreground">Lat: {parseFloat(asset.lastLat).toFixed(6)}</p>
              <p className="text-xs text-muted-foreground">Lng: {parseFloat(asset.lastLng).toFixed(6)}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
