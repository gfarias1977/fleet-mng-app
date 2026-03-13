'use client';

import { useEffect } from 'react';
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
import { createGeofenceAction, updateGeofenceAction } from '@/app/(main)/geofences/actions';
import type { GeofenceRow } from '@/data/geofences';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  geofenceTypeId: z.string().min(1, 'Type is required'),
  centerLatitude: z.string().optional(),
  centerLongitude: z.string().optional(),
  radiusMeters: z.string().optional(),
  active: z.enum(['true', 'false']),
});

type FormValues = z.infer<typeof schema>;

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
      geofenceTypeId: '',
      centerLatitude: '',
      centerLongitude: '',
      radiusMeters: '',
      active: 'true',
    },
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (geofence) {
      form.reset({
        name: geofence.name,
        description: geofence.description ?? '',
        geofenceTypeId: String(geofence.geofenceTypeId),
        centerLatitude: geofence.centerLatitude ?? '',
        centerLongitude: geofence.centerLongitude ?? '',
        radiusMeters: geofence.radiusMeters ?? '',
        active: geofence.active === false ? 'false' : 'true',
      });
    } else {
      form.reset({
        name: '',
        description: '',
        geofenceTypeId: '',
        centerLatitude: '',
        centerLongitude: '',
        radiusMeters: '',
        active: 'true',
      });
    }
  }, [geofence, form]);

  async function onSubmit(values: FormValues) {
    const payload = {
      name: values.name,
      description: values.description || null,
      geofenceTypeId: Number(values.geofenceTypeId),
      centerLatitude: values.centerLatitude || null,
      centerLongitude: values.centerLongitude || null,
      radiusMeters: values.radiusMeters || null,
      active: values.active === 'true',
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Geofence' : 'New Geofence'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            {/* Center Lat / Lng */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="centerLatitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Center Latitude</FormLabel>
                    <FormControl>
                      <Input placeholder="0.00000000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="centerLongitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Center Longitude</FormLabel>
                    <FormControl>
                      <Input placeholder="0.00000000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Radius */}
            <FormField
              control={form.control}
              name="radiusMeters"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Radius (meters)</FormLabel>
                  <FormControl>
                    <Input placeholder="500" {...field} />
                  </FormControl>
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

            <DialogFooter>
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
