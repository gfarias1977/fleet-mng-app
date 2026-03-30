'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  createGeofenceAction,
  updateGeofenceAction,
  getGeofenceWithGeometryAction,
} from '@/app/(main)/geofences/actions';
import type { GeofenceRow, GeofenceGeometry } from '@/data/geofences';
import type { EditorGeometry } from './GeofenceEditorMap';

// Dynamically import the map — no SSR
const GeofenceEditorMap = dynamic(() => import('./GeofenceEditorMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full min-h-[350px]" />,
});

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(100),
  description: z.string().max(500).optional(),
  geofenceTypeId: z.string().min(1, 'Tipo requerido'),
  active: z.enum(['true', 'false']),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function geometryToEditor(geometry: GeofenceGeometry): EditorGeometry {
  if (!geometry) return null;
  if (geometry.type === 'circular') {
    return {
      type: 'circular',
      lat: parseFloat(geometry.centerLatitude),
      lng: parseFloat(geometry.centerLongitude),
      radius: parseFloat(geometry.radiusMeters),
    };
  }
  if (geometry.type === 'polygon') {
    return {
      type: 'polygon',
      points: geometry.points.map((p) => ({
        lat: parseFloat(p.latitude),
        lng: parseFloat(p.longitude),
      })),
    };
  }
  if (geometry.type === 'rectangular') {
    return {
      type: 'rectangular',
      nwLat: parseFloat(geometry.nwLatitude),
      nwLng: parseFloat(geometry.nwLongitude),
      seLat: parseFloat(geometry.seLatitude),
      seLng: parseFloat(geometry.seLongitude),
    };
  }
  return null;
}

function editorToGeometry(editor: EditorGeometry): GeofenceGeometry {
  if (!editor) return null;
  if (editor.type === 'circular') {
    return {
      type: 'circular',
      centerLatitude: String(editor.lat),
      centerLongitude: String(editor.lng),
      radiusMeters: String(editor.radius),
    };
  }
  if (editor.type === 'polygon') {
    return {
      type: 'polygon',
      points: editor.points.map((p, i) => ({
        latitude: String(p.lat),
        longitude: String(p.lng),
        pointOrder: i,
      })),
    };
  }
  if (editor.type === 'rectangular') {
    return {
      type: 'rectangular',
      nwLatitude: String(editor.nwLat),
      nwLongitude: String(editor.nwLng),
      seLatitude: String(editor.seLat),
      seLongitude: String(editor.seLng),
    };
  }
  return null;
}

function getGeometryType(
  typeId: string,
  geofenceTypes: { id: number; name: string }[]
): 'circular' | 'polygon' | 'rectangular' {
  const name = geofenceTypes.find((t) => t.id === Number(typeId))?.name?.toLowerCase() ?? '';
  if (name === 'polygon' || name === 'poligonal') return 'polygon';
  if (name === 'rectangular') return 'rectangular';
  return 'circular';
}

function isGeometryComplete(editor: EditorGeometry): boolean {
  if (!editor) return false;
  if (editor.type === 'circular') return editor.lat !== 0 || editor.lng !== 0;
  if (editor.type === 'polygon') return editor.points.length >= 3;
  if (editor.type === 'rectangular') return editor.seLat !== 0;
  return false;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  geofence: GeofenceRow | null;
  geofenceTypes: { id: number; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GeofenceFormDialog({
  open,
  geofence,
  geofenceTypes,
  onClose,
  onSuccess,
}: Props) {
  const isEdit = geofence !== null;
  const defaultTypeId = String(geofenceTypes[0]?.id ?? '');

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      geofenceTypeId: defaultTypeId,
      active: 'true',
    },
  });

  const [editorGeometry, setEditorGeometry] = useState<EditorGeometry>(null);
  const [initialGeometry, setInitialGeometry] = useState<EditorGeometry>(null);

  const selectedTypeId = form.watch('geofenceTypeId');
  const mapGeometryType = getGeometryType(selectedTypeId, geofenceTypes);

  // Prevents the type-change effect from wiping geometry during initial edit load.
  // Set to true before form.reset(), cleared after the async geometry fetch completes.
  const isInitialLoadRef = useRef(false);

  // Reset geometry when user manually changes type (skip during initial edit load)
  useEffect(() => {
    if (isInitialLoadRef.current) return;
    setEditorGeometry(null);
  }, [selectedTypeId]);

  // Pre-fill when editing / reset when creating
  useEffect(() => {
    if (!open) return;

    if (geofence) {
      isInitialLoadRef.current = true;
      form.reset({
        name: geofence.name,
        description: geofence.description ?? '',
        geofenceTypeId: String(geofence.geofenceTypeId),
        active: geofence.active === false ? 'false' : 'true',
      });
      setEditorGeometry(null);
      setInitialGeometry(null);

      getGeofenceWithGeometryAction({ id: String(geofence.id) }).then((result) => {
        isInitialLoadRef.current = false;
        if (result.success && result.data?.geometry) {
          const geo = geometryToEditor(result.data.geometry);
          setEditorGeometry(geo);
          setInitialGeometry(geo);
        }
      });
    } else {
      form.reset({
        name: '',
        description: '',
        geofenceTypeId: defaultTypeId,
        active: 'true',
      });
      setEditorGeometry(null);
      setInitialGeometry(null);
    }
  }, [geofence, open, form, defaultTypeId]);

  async function onSubmit(values: FormValues) {
    const geometry = editorToGeometry(editorGeometry);

    if (!geometry) {
      toast.error('Dibuja la geocerca en el mapa antes de guardar.');
      return;
    }

    if (!isGeometryComplete(editorGeometry)) {
      if (editorGeometry?.type === 'polygon') {
        toast.error('El polígono requiere al menos 3 vértices.');
      } else if (editorGeometry?.type === 'rectangular') {
        toast.error('Selecciona las dos esquinas del rectángulo.');
      }
      return;
    }

    const payload = {
      name: values.name,
      description: values.description || null,
      geofenceTypeId: Number(values.geofenceTypeId),
      active: values.active === 'true',
      geometry,
    };

    if (isEdit) {
      const result = await updateGeofenceAction({ id: String(geofence!.id), ...payload });
      if (!result.success) { toast.error(result.error); return; }
      toast.success('Geocerca actualizada.');
    } else {
      const result = await createGeofenceAction(payload);
      if (!result.success) { toast.error(result.error); return; }
      toast.success('Geocerca creada.');
    }

    onSuccess();
  }

  const geometryComplete = isGeometryComplete(editorGeometry);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Geocerca' : 'Nueva Geocerca'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              {/* Left column: fields */}
              <div className="space-y-4">
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Mi Geocerca" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descripción opcional..." rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Type */}
                <FormField
                  control={form.control}
                  name="geofenceTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {geofenceTypes.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Active */}
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activa</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Sí</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Geometry summary */}
                {editorGeometry && (
                  <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground space-y-1">
                    {editorGeometry.type === 'circular' && (
                      <>
                        <p>Centro: {editorGeometry.lat.toFixed(6)}, {editorGeometry.lng.toFixed(6)}</p>
                        <p>Radio: {editorGeometry.radius} m</p>
                      </>
                    )}
                    {editorGeometry.type === 'polygon' && (
                      <p>{editorGeometry.points.length} vértices{geometryComplete ? ' ✓' : ` — faltan ${3 - editorGeometry.points.length}`}</p>
                    )}
                    {editorGeometry.type === 'rectangular' && editorGeometry.seLat !== 0 && (
                      <>
                        <p>NW: {editorGeometry.nwLat.toFixed(6)}, {editorGeometry.nwLng.toFixed(6)}</p>
                        <p>SE: {editorGeometry.seLat.toFixed(6)}, {editorGeometry.seLng.toFixed(6)}</p>
                      </>
                    )}
                    {editorGeometry.type === 'rectangular' && editorGeometry.seLat === 0 && (
                      <p>NW fijado — selecciona la esquina SE en el mapa</p>
                    )}
                  </div>
                )}
              </div>

              {/* Right column: map */}
              <div className="flex flex-col" style={{ minHeight: '420px' }}>
                <GeofenceEditorMap
                  geometryType={mapGeometryType}
                  value={editorGeometry}
                  onChange={setEditorGeometry}
                  initialValue={initialGeometry}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Guardando…' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
