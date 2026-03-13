'use client';

import { useEffect, useState } from 'react';
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
import { createGeofenceAction, updateGeofenceAction, getGeofenceWithGeometryAction } from '@/app/(main)/geofences/actions';
import type { GeofenceRow, GeofenceGeometry } from '@/data/geofences';
import type { EditorGeometry } from './GeofenceEditorMap';

// Dynamically import the map – no SSR
const GeofenceEditorMap = dynamic(() => import('./GeofenceEditorMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full min-h-[350px]" />,
});

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  geofenceTypeId: z.string().min(1, 'Type is required'),
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

function editorToGeometry(
  editor: EditorGeometry,
  typeId: number
): GeofenceGeometry {
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
  void typeId;
  return null;
}

function getGeometryType(
  typeId: string,
  geofenceTypes: { id: number; name: string }[]
): 'circular' | 'polygon' | 'rectangular' {
  const name = geofenceTypes.find((t) => t.id === Number(typeId))?.name?.toLowerCase() ?? '';
  if (name === 'polygon') return 'polygon';
  if (name === 'rectangular') return 'rectangular';
  return 'circular';
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

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      geofenceTypeId: '1',
      active: 'true',
    },
  });

  const [editorGeometry, setEditorGeometry] = useState<EditorGeometry>(null);
  const [initialGeometry, setInitialGeometry] = useState<EditorGeometry>(null);
  const selectedTypeId = form.watch('geofenceTypeId');
  const mapGeometryType = getGeometryType(selectedTypeId, geofenceTypes);

  // Reset geometry when type changes
  useEffect(() => {
    setEditorGeometry(null);
  }, [selectedTypeId]);

  // Pre-fill when editing
  useEffect(() => {
    if (!open) return;

    if (geofence) {
      form.reset({
        name: geofence.name,
        description: geofence.description ?? '',
        geofenceTypeId: String(geofence.geofenceTypeId),
        active: geofence.active === false ? 'false' : 'true',
      });
      setEditorGeometry(null);
      setInitialGeometry(null);

      // Fetch geometry for edit mode
      getGeofenceWithGeometryAction({ id: String(geofence.id) }).then((result) => {
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
        geofenceTypeId: '1',
        active: 'true',
      });
      setEditorGeometry(null);
      setInitialGeometry(null);
    }
  }, [geofence, open, form]);

  async function onSubmit(values: FormValues) {
    const typeId = Number(values.geofenceTypeId);
    const geometry = editorToGeometry(editorGeometry, typeId);

    if (!geometry) {
      toast.error('Please draw a geofence on the map.');
      return;
    }

    const payload = {
      name: values.name,
      description: values.description || null,
      geofenceTypeId: typeId,
      active: values.active === 'true',
      geometry,
    };

    if (isEdit) {
      const result = await updateGeofenceAction({
        id: String(geofence!.id),
        ...payload,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Geofence updated successfully.');
    } else {
      const result = await createGeofenceAction(payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Geofence created successfully.');
    }

    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Geofence' : 'New Geofence'}</DialogTitle>
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
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Geofence" {...field} />
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
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Optional description..." rows={2} {...field} />
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
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type..." />
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
                      <FormLabel>Active</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Geometry summary */}
                {editorGeometry && (
                  <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                    {editorGeometry.type === 'circular' && (
                      <>Center: {editorGeometry.lat.toFixed(5)}, {editorGeometry.lng.toFixed(5)} · Radius: {editorGeometry.radius}m</>
                    )}
                    {editorGeometry.type === 'polygon' && (
                      <>{editorGeometry.points.length} vertices</>
                    )}
                    {editorGeometry.type === 'rectangular' && editorGeometry.seLat !== 0 && (
                      <>NW: {editorGeometry.nwLat.toFixed(5)}, {editorGeometry.nwLng.toFixed(5)} · SE: {editorGeometry.seLat.toFixed(5)}, {editorGeometry.seLng.toFixed(5)}</>
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
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
