'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
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
import { Button } from '@/components/ui/button';
import { updateTelemetryEventAction } from '@/app/(main)/telemetry-events/actions';
import type { TelemetryEventRow } from '@/data/telemetry-events';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  eventTimestamp: z.string().min(1, 'Fecha/hora requerida'),
  latitude: z
    .string()
    .min(1, 'Latitud requerida')
    .regex(/^-?\d+(\.\d+)?$/, 'Latitud inválida'),
  longitude: z
    .string()
    .min(1, 'Longitud requerida')
    .regex(/^-?\d+(\.\d+)?$/, 'Longitud inválida'),
  jsonData: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  event: TelemetryEventRow | null;
  onClose: () => void;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TelemetryEventFormDialog({ open, event, onClose, onSuccess }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      eventTimestamp: '',
      latitude: '',
      longitude: '',
      jsonData: '',
    },
  });

  useEffect(() => {
    if (!open || !event) return;

    form.reset({
      eventTimestamp: format(new Date(event.eventTimestamp), "yyyy-MM-dd'T'HH:mm"),
      latitude: event.latitude,
      longitude: event.longitude,
      jsonData: event.jsonData ? JSON.stringify(event.jsonData, null, 2) : '',
    });
  }, [event, open, form]);

  async function onSubmit(values: FormValues) {
    if (!event) return;

    const result = await updateTelemetryEventAction({
      id: String(event.id),
      eventTimestamp: new Date(values.eventTimestamp),
      latitude: values.latitude,
      longitude: values.longitude,
      jsonData: values.jsonData || null,
    });

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Evento actualizado correctamente.');
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Evento de Telemetría</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Event Timestamp */}
            <FormField
              control={form.control}
              name="eventTimestamp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha/Hora Evento</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Latitude */}
            <FormField
              control={form.control}
              name="latitude"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Latitud</FormLabel>
                  <FormControl>
                    <Input placeholder="ej. -33.45694" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Longitude */}
            <FormField
              control={form.control}
              name="longitude"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Longitud</FormLabel>
                  <FormControl>
                    <Input placeholder="ej. -70.64827" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* JSON Data */}
            <FormField
              control={form.control}
              name="jsonData"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Datos JSON (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='{"key": "value"}'
                      rows={5}
                      className="font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
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
