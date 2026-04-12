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
import {
  createAlertNotificationAction,
  updateAlertNotificationAction,
} from '@/app/(main)/alert-notifications/actions';
import type {
  AlertNotificationRow,
  AlertForSelectOption,
} from '@/data/alert-notifications';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createSchema = z.object({
  alertId: z.string().min(1, 'Alerta requerida'),
  alertTimestamp: z.string().min(1, 'Timestamp de alerta requerido'),
  notificationMethod: z.string().optional(),
  destination: z.string().max(255).optional(),
  subject: z.string().max(255).optional(),
  body: z.string().optional(),
  status: z.string().min(1, 'Estado requerido'),
  retryCount: z.number().int().min(0),
  maxRetries: z.number().int().min(0),
});

const editSchema = z.object({
  notificationMethod: z.string().optional(),
  destination: z.string().max(255).optional(),
  subject: z.string().max(255).optional(),
  body: z.string().optional(),
  status: z.string().min(1, 'Estado requerido'),
  retryCount: z.number().int().min(0),
  maxRetries: z.number().int().min(0),
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

const METHOD_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'push', label: 'Push' },
  { value: 'webhook', label: 'Webhook' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'sent', label: 'Enviada' },
  { value: 'delivered', label: 'Entregada' },
  { value: 'failed', label: 'Fallida' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  notification: AlertNotificationRow | null;
  alertsForSelect: AlertForSelectOption[];
  onClose: () => void;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Create form
// ---------------------------------------------------------------------------

function CreateForm({
  alertsForSelect,
  onClose,
  onSuccess,
}: {
  alertsForSelect: AlertForSelectOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      alertId: '',
      alertTimestamp: '',
      notificationMethod: 'email',
      destination: '',
      subject: '',
      body: '',
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
    },
  });

  // When alert is selected, auto-fill alertTimestamp
  const watchedAlertId = form.watch('alertId');
  useEffect(() => {
    if (!watchedAlertId) return;
    const found = alertsForSelect.find((a) => String(a.id) === watchedAlertId);
    if (found) {
      form.setValue('alertTimestamp', found.alertTimestamp.toISOString());
    }
  }, [watchedAlertId, alertsForSelect, form]);

  async function onSubmit(values: CreateFormValues) {
    const result = await createAlertNotificationAction({
      alertId: values.alertId,
      alertTimestamp: values.alertTimestamp,
      notificationMethod: values.notificationMethod || null,
      destination: values.destination || null,
      subject: values.subject || null,
      body: values.body || null,
      status: values.status,
      retryCount: values.retryCount,
      maxRetries: values.maxRetries,
    });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Notificación creada correctamente.');
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Alert */}
        <FormField
          control={form.control}
          name="alertId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alerta</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar alerta..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {alertsForSelect.map((a) => (
                    <SelectItem key={String(a.id)} value={String(a.id)}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          {/* Method */}
          <FormField
            control={form.control}
            name="notificationMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Método</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {METHOD_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

        {/* Destination */}
        <FormField
          control={form.control}
          name="destination"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Destino</FormLabel>
              <FormControl>
                <Input placeholder="ej. usuario@ejemplo.com o +56912345678" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Subject */}
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asunto</FormLabel>
              <FormControl>
                <Input placeholder="Asunto de la notificación..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Body */}
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cuerpo</FormLabel>
              <FormControl>
                <Textarea placeholder="Contenido de la notificación..." rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          {/* Retry Count */}
          <FormField
            control={form.control}
            name="retryCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reintentos realizados</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Max Retries */}
          <FormField
            control={form.control}
            name="maxRetries"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Máximo reintentos</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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

function EditForm({
  notification,
  onClose,
  onSuccess,
}: {
  notification: AlertNotificationRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      notificationMethod: notification.notificationMethod ?? '',
      destination: notification.destination ?? '',
      subject: notification.subject ?? '',
      body: notification.body ?? '',
      status: notification.status ?? 'pending',
      retryCount: notification.retryCount ?? 0,
      maxRetries: notification.maxRetries ?? 3,
    },
  });

  useEffect(() => {
    form.reset({
      notificationMethod: notification.notificationMethod ?? '',
      destination: notification.destination ?? '',
      subject: notification.subject ?? '',
      body: notification.body ?? '',
      status: notification.status ?? 'pending',
      retryCount: notification.retryCount ?? 0,
      maxRetries: notification.maxRetries ?? 3,
    });
  }, [notification, form]);

  async function onSubmit(values: EditFormValues) {
    const result = await updateAlertNotificationAction({
      id: String(notification.id),
      notificationMethod: values.notificationMethod || null,
      destination: values.destination || null,
      subject: values.subject || null,
      body: values.body || null,
      status: values.status,
      retryCount: values.retryCount,
      maxRetries: values.maxRetries,
    });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Notificación actualizada correctamente.');
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Read-only info */}
        <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground bg-muted/40 rounded-md p-3">
          <div>
            <span className="font-medium text-foreground">Tipo de alerta:</span>{' '}
            {notification.alertTypeName ?? '—'}
          </div>
          <div>
            <span className="font-medium text-foreground">ID Alerta:</span>{' '}
            {String(notification.alertId)}
          </div>
          <div>
            <span className="font-medium text-foreground">Timestamp:</span>{' '}
            {new Date(notification.alertTimestamp).toLocaleString('es-CL')}
          </div>
          <div>
            <span className="font-medium text-foreground">Creado:</span>{' '}
            {notification.createdAt
              ? new Date(notification.createdAt).toLocaleString('es-CL')
              : '—'}
          </div>
        </div>

        {notification.errorMessage && (
          <div className="text-xs text-destructive bg-destructive/10 rounded-md p-2">
            <span className="font-medium">Error:</span> {notification.errorMessage}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Method */}
          <FormField
            control={form.control}
            name="notificationMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Método</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {METHOD_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

        {/* Destination */}
        <FormField
          control={form.control}
          name="destination"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Destino</FormLabel>
              <FormControl>
                <Input placeholder="ej. usuario@ejemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Subject */}
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asunto</FormLabel>
              <FormControl>
                <Input placeholder="Asunto de la notificación..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Body */}
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cuerpo</FormLabel>
              <FormControl>
                <Textarea placeholder="Contenido de la notificación..." rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          {/* Retry Count */}
          <FormField
            control={form.control}
            name="retryCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reintentos realizados</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Max Retries */}
          <FormField
            control={form.control}
            name="maxRetries"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Máximo reintentos</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
// Main dialog
// ---------------------------------------------------------------------------

export function AlertNotificationFormDialog({
  open,
  notification,
  alertsForSelect,
  onClose,
  onSuccess,
}: Props) {
  const isEdit = notification !== null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Notificación' : 'Nueva Notificación'}
          </DialogTitle>
        </DialogHeader>

        {isEdit ? (
          <EditForm notification={notification} onClose={onClose} onSuccess={onSuccess} />
        ) : (
          <CreateForm
            alertsForSelect={alertsForSelect}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
