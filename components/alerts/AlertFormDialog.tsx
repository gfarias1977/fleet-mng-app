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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { createAlertAction, updateAlertAction } from '@/app/(main)/alerts/actions';
import type {
  AlertListRow,
  AlertTypeSelectOption,
  DeviceSelectOption,
  GeofenceSelectOption,
} from '@/data/alerts';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const createSchema = z.object({
  alertTypeId: z.number().int().positive('Tipo de alerta requerido'),
  deviceId: z.string().min(1, 'Dispositivo requerido'),
  geofenceId: z.string().optional(),
  alertTimestamp: z.string().min(1, 'Fecha/hora requerida'),
  message: z.string().optional(),
  severity: z.number().int().min(1, 'Mínimo 1').max(5, 'Máximo 5'),
  status: z.string().min(1, 'Estado requerido'),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

const editSchema = z.object({
  message: z.string().optional(),
  severity: z.number().int().min(1, 'Mínimo 1').max(5, 'Máximo 5'),
  status: z.string().min(1, 'Estado requerido'),
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activa' },
  { value: 'acknowledged', label: 'Confirmada' },
  { value: 'resolved', label: 'Resuelta' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  alert: AlertListRow | null;
  alertTypes: AlertTypeSelectOption[];
  devices: DeviceSelectOption[];
  geofences: GeofenceSelectOption[];
  onClose: () => void;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Create form
// ---------------------------------------------------------------------------

function CreateAlertForm({
  alertTypes,
  devices,
  geofences,
  onClose,
  onSuccess,
}: Omit<Props, 'open' | 'alert'>) {
  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      alertTypeId: undefined,
      deviceId: '',
      geofenceId: '',
      alertTimestamp: new Date().toISOString().slice(0, 16),
      message: '',
      severity: 1,
      status: 'active',
      latitude: '',
      longitude: '',
    },
  });

  async function onSubmit(values: CreateFormValues) {
    const result = await createAlertAction({
      alertTypeId: values.alertTypeId,
      deviceId: values.deviceId,
      geofenceId: values.geofenceId || null,
      alertTimestamp: values.alertTimestamp,
      message: values.message || null,
      severity: values.severity,
      status: values.status,
      latitude: values.latitude || null,
      longitude: values.longitude || null,
    });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Alerta creada correctamente.');
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Alert Type */}
          <FormField
            control={form.control}
            name="alertTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de alerta</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(Number(v))}
                  value={field.value ? String(field.value) : ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {alertTypes.map((at) => (
                      <SelectItem key={at.id} value={String(at.id)}>
                        {at.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Device */}
          <FormField
            control={form.control}
            name="deviceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dispositivo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {devices.map((d) => (
                      <SelectItem key={String(d.id)} value={String(d.id)}>
                        {d.name} ({d.serialNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Geofence */}
          <FormField
            control={form.control}
            name="geofenceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Geocerca (opcional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin geocerca" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Sin geocerca</SelectItem>
                    {geofences.map((g) => (
                      <SelectItem key={String(g.id)} value={String(g.id)}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Alert Timestamp */}
          <FormField
            control={form.control}
            name="alertTimestamp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha/Hora</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Severity */}
          <FormField
            control={form.control}
            name="severity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Severidad (1–5)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Latitude */}
          <FormField
            control={form.control}
            name="latitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Latitud (opcional)</FormLabel>
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
                <FormLabel>Longitud (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="ej. -70.64827" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Message */}
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mensaje</FormLabel>
              <FormControl>
                <Textarea placeholder="Descripción de la alerta..." rows={3} {...field} />
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
  );
}

// ---------------------------------------------------------------------------
// Edit form
// ---------------------------------------------------------------------------

function EditAlertForm({
  alert,
  onClose,
  onSuccess,
}: {
  alert: AlertListRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      message: alert.message ?? '',
      severity: alert.severity ?? 1,
      status: alert.status ?? 'active',
    },
  });

  useEffect(() => {
    form.reset({
      message: alert.message ?? '',
      severity: alert.severity ?? 1,
      status: alert.status ?? 'active',
    });
  }, [alert, form]);

  async function onSubmit(values: EditFormValues) {
    const result = await updateAlertAction({
      id: String(alert.id),
      alertTimestamp: alert.alertTimestamp.toISOString(),
      message: values.message || null,
      severity: values.severity,
      status: values.status,
    });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Alerta actualizada correctamente.');
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Read-only info */}
        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground bg-muted/40 rounded-md p-3">
          <div>
            <span className="font-medium text-foreground">Tipo:</span> {alert.alertTypeName}
          </div>
          <div>
            <span className="font-medium text-foreground">Dispositivo:</span> {alert.deviceName}
          </div>
          <div>
            <span className="font-medium text-foreground">Geocerca:</span>{' '}
            {alert.geofenceName ?? '—'}
          </div>
          <div>
            <span className="font-medium text-foreground">Fecha/Hora:</span>{' '}
            {alert.alertTimestamp
              ? new Date(alert.alertTimestamp).toLocaleString('es-CL')
              : '—'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Severity */}
          <FormField
            control={form.control}
            name="severity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Severidad (1–5)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Message */}
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mensaje</FormLabel>
              <FormControl>
                <Textarea placeholder="Descripción de la alerta..." rows={3} {...field} />
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
  );
}

// ---------------------------------------------------------------------------
// Main dialog (routes to create or edit)
// ---------------------------------------------------------------------------

export function AlertFormDialog({
  open,
  alert,
  alertTypes,
  devices,
  geofences,
  onClose,
  onSuccess,
}: Props) {
  const isEdit = alert !== null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Alerta' : 'Nueva Alerta'}</DialogTitle>
        </DialogHeader>

        {isEdit ? (
          <EditAlertForm alert={alert} onClose={onClose} onSuccess={onSuccess} />
        ) : (
          <CreateAlertForm
            alertTypes={alertTypes}
            devices={devices}
            geofences={geofences}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
