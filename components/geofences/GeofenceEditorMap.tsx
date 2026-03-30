'use client';

import { useEffect, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Circle,
  Polygon,
  Rectangle,
  Marker,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Fix Leaflet default icon
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EditorGeometry =
  | { type: 'circular'; lat: number; lng: number; radius: number }
  | { type: 'polygon'; points: { lat: number; lng: number }[] }
  | { type: 'rectangular'; nwLat: number; nwLng: number; seLat: number; seLng: number }
  | null;

interface Props {
  geometryType: 'circular' | 'polygon' | 'rectangular';
  value: EditorGeometry;
  onChange: (value: EditorGeometry) => void;
  initialValue?: EditorGeometry;
}

// ---------------------------------------------------------------------------
// CenterOnInitialGeometry
// ---------------------------------------------------------------------------

function CenterOnInitialGeometry({ initialValue }: { initialValue: EditorGeometry | undefined }) {
  const map = useMap();
  const prevRef = useRef<EditorGeometry>(null);

  useEffect(() => {
    // Reset tracking when dialog is cleared between edits so next load always centers
    if (!initialValue) {
      prevRef.current = null;
      return;
    }
    if (JSON.stringify(prevRef.current) === JSON.stringify(initialValue)) return;
    prevRef.current = initialValue;

    if (initialValue.type === 'circular') {
      map.flyTo([initialValue.lat, initialValue.lng], 14);
    } else if (initialValue.type === 'polygon' && initialValue.points.length > 0) {
      map.fitBounds(
        L.latLngBounds(initialValue.points.map((p) => [p.lat, p.lng] as [number, number])),
        { padding: [60, 60] }
      );
    } else if (initialValue.type === 'rectangular' && initialValue.seLat !== 0) {
      map.fitBounds(
        [[initialValue.nwLat, initialValue.nwLng], [initialValue.seLat, initialValue.seLng]],
        { padding: [60, 60] }
      );
    }
  }, [initialValue, map]);

  return null;
}

// ---------------------------------------------------------------------------
// FlyTo handler
// ---------------------------------------------------------------------------

function FlyToHandler({ flyTo }: { flyTo: { lat: number; lng: number; zoom: number } | null }) {
  const map = useMap();
  const prevRef = useRef<typeof flyTo>(null);

  useEffect(() => {
    if (!flyTo) return;
    if (prevRef.current?.lat === flyTo.lat && prevRef.current?.lng === flyTo.lng) return;
    prevRef.current = flyTo;
    map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom);
  }, [flyTo, map]);

  return null;
}

// ---------------------------------------------------------------------------
// Map interaction
// ---------------------------------------------------------------------------

function MapInteraction({
  geometryType,
  value,
  onChange,
  circularRadius,
}: {
  geometryType: 'circular' | 'polygon' | 'rectangular';
  value: EditorGeometry;
  onChange: (v: EditorGeometry) => void;
  circularRadius: number;
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;

      if (geometryType === 'circular') {
        const radius = value?.type === 'circular' ? value.radius : circularRadius;
        onChange({ type: 'circular', lat, lng, radius });

      } else if (geometryType === 'polygon') {
        const existing = value?.type === 'polygon' ? value.points : [];
        onChange({ type: 'polygon', points: [...existing, { lat, lng }] });

      } else if (geometryType === 'rectangular') {
        // No value or wrong type → first click sets NW corner
        if (!value || value.type !== 'rectangular') {
          onChange({ type: 'rectangular', nwLat: lat, nwLng: lng, seLat: 0, seLng: 0 });
        } else if (value.seLat === 0) {
          // Second click → sets SE corner
          onChange({ ...value, seLat: lat, seLng: lng });
        } else {
          // Third click → starts over with new NW corner
          onChange({ type: 'rectangular', nwLat: lat, nwLng: lng, seLat: 0, seLng: 0 });
        }
      }
    },
  });
  return null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function GeofenceEditorMap({ geometryType, value, onChange, initialValue }: Props) {
  const [addressInput, setAddressInput] = useState('');
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [tileLayer, setTileLayer] = useState<'default' | 'satellite'>('default');

  // Independent radius state — persists before center is clicked and across re-renders
  const [circularRadius, setCircularRadius] = useState(500);

  // Sync radius when geometry is loaded externally (edit mode)
  useEffect(() => {
    if (value?.type === 'circular') {
      setCircularRadius(value.radius);
    }
  }, [value]);

  async function handleAddressSearch() {
    const q = addressInput.trim();
    if (!q) return;
    setAddressLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
        { headers: { 'Accept-Language': 'es' } }
      );
      const data = await res.json();
      if (data?.length > 0) {
        const { lat, lon } = data[0];
        setFlyTo({ lat: parseFloat(lat), lng: parseFloat(lon), zoom: 14 });
      }
    } finally {
      setAddressLoading(false);
    }
  }

  function handleRadiusChange(e: React.ChangeEvent<HTMLInputElement>) {
    const r = parseFloat(e.target.value);
    if (isNaN(r) || r <= 0) return;
    setCircularRadius(r);
    // Also update the live geometry if a center is already set
    if (value?.type === 'circular') {
      onChange({ ...value, radius: r });
    }
  }

  function handleUndoPoint() {
    if (value?.type === 'polygon' && value.points.length > 0) {
      onChange({ type: 'polygon', points: value.points.slice(0, -1) });
    }
  }

  function handleReset() {
    onChange(null);
  }

  // Derived display values
  const polygonPositions =
    value?.type === 'polygon'
      ? value.points.map((p) => [p.lat, p.lng] as [number, number])
      : [];

  const rectBounds =
    value?.type === 'rectangular' && value.seLat !== 0
      ? ([[value.nwLat, value.nwLng], [value.seLat, value.seLng]] as [[number, number], [number, number]])
      : null;

  const rectState =
    !value || value.type !== 'rectangular'
      ? 'none'
      : value.seLat === 0
      ? 'nw-set'
      : 'complete';

  const polygonCount = value?.type === 'polygon' ? value.points.length : 0;

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Address search */}
      <div className="flex gap-2">
        <Input
          placeholder="Buscar dirección o ciudad..."
          value={addressInput}
          onChange={(e) => setAddressInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddressSearch()}
          className="flex-1 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddressSearch}
          disabled={addressLoading}
        >
          {addressLoading ? '…' : 'Ir'}
        </Button>
      </div>

      {/* Geometry controls */}
      <div className="flex flex-wrap gap-3 items-center min-h-[32px]">

        {/* CIRCULAR — radius input always visible */}
        {geometryType === 'circular' && (
          <>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Radio (m):</Label>
              <Input
                type="number"
                min={1}
                step={50}
                value={circularRadius}
                onChange={handleRadiusChange}
                className="w-28 text-sm h-7"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {value?.type === 'circular'
                ? `Centro: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
                : 'Haz clic en el mapa para fijar el centro'}
            </span>
          </>
        )}

        {/* POLYGON — undo + point counter */}
        {geometryType === 'polygon' && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUndoPoint}
              disabled={polygonCount === 0}
            >
              Deshacer punto
            </Button>
            <span className="text-xs text-muted-foreground">
              {polygonCount === 0
                ? 'Haz clic en el mapa para agregar vértices'
                : `${polygonCount} vértice${polygonCount !== 1 ? 's' : ''}${polygonCount < 3 ? ` — faltan ${3 - polygonCount} para cerrar` : ' ✓'}`}
            </span>
          </>
        )}

        {/* RECTANGULAR — step hints */}
        {geometryType === 'rectangular' && (
          <span className="text-xs text-muted-foreground">
            {rectState === 'none' && 'Haz clic para fijar la esquina NW (noroeste)'}
            {rectState === 'nw-set' && 'Ahora haz clic para fijar la esquina SE (sureste)'}
            {rectState === 'complete' && 'Rectángulo completo · haz clic para reiniciar'}
          </span>
        )}

        <Button type="button" variant="outline" size="sm" onClick={handleReset} className="ml-auto">
          Limpiar
        </Button>
      </div>

      {/* Map */}
      <div
        className="relative flex-1 min-h-0 rounded-md overflow-hidden border"
        style={{ minHeight: '350px' }}
      >
        <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
          {tileLayer === 'default' ? (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          ) : (
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          )}

          <CenterOnInitialGeometry initialValue={initialValue} />
          <FlyToHandler flyTo={flyTo} />
          <MapInteraction
            geometryType={geometryType}
            value={value}
            onChange={onChange}
            circularRadius={circularRadius}
          />

          {/* Circular */}
          {value?.type === 'circular' && (
            <>
              <Marker position={[value.lat, value.lng]} />
              <Circle
                center={[value.lat, value.lng]}
                radius={value.radius}
                pathOptions={{ color: 'hsl(215, 100%, 50%)', fillOpacity: 0.15 }}
              />
            </>
          )}

          {/* Polygon — markers draggables + polygon when ≥ 3 pts */}
          {value?.type === 'polygon' && polygonPositions.length >= 3 && (
            <Polygon
              positions={polygonPositions}
              pathOptions={{ color: 'hsl(142, 76%, 36%)', fillOpacity: 0.2 }}
            />
          )}
          {value?.type === 'polygon' &&
            polygonPositions.map((pos, idx) => (
              <Marker
                key={idx}
                position={pos}
                draggable
                eventHandlers={{
                  dragend(e) {
                    const { lat, lng } = e.target.getLatLng();
                    if (value.type !== 'polygon') return;
                    const updated = value.points.map((p, i) =>
                      i === idx ? { lat, lng } : p
                    );
                    onChange({ type: 'polygon', points: updated });
                  },
                }}
              />
            ))}

          {/* Rectangular */}
          {rectBounds && (
            <Rectangle
              bounds={rectBounds}
              pathOptions={{ color: 'hsl(38, 92%, 50%)', fillOpacity: 0.2 }}
            />
          )}
          {value?.type === 'rectangular' && (
            <>
              {value.nwLat !== 0 && <Marker position={[value.nwLat, value.nwLng]} />}
              {value.seLat !== 0 && <Marker position={[value.seLat, value.seLng]} />}
            </>
          )}
        </MapContainer>

        <button
          type="button"
          onClick={() => setTileLayer((t) => (t === 'default' ? 'satellite' : 'default'))}
          className="absolute top-2 right-2 z-[1001] bg-white rounded shadow px-2 py-1 text-xs font-medium border border-gray-200 hover:bg-gray-50 cursor-pointer"
        >
          {tileLayer === 'default' ? 'Satélite' : 'Mapa'}
        </button>
      </div>
    </div>
  );
}
