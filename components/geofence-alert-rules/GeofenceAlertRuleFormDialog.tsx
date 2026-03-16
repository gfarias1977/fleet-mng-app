'use client';

import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createGeofenceAlertRuleAction,
  updateGeofenceAlertRuleAction,
} from '@/app/(main)/geofence-alert-rules/actions';
import type { GeofenceAlertRuleRow } from '@/data/geofence-alert-rules';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  geofenceId: z.string().min(1, 'Geocerca es requerida'),
  alertTypeId: z.string().min(1, 'Tipo de alerta es requerido'),
  conditionType: z.string().max(50).optional(),
  thresholdValue: z.string().optional(),
  thresholdUnit: z.string().max(20).optional(),
  cooldownPeriod: z.string().optional(),
  minimumDuration: z.string().optional(),
  notificationChannels: z.array(z.string()),
  webhookUrl: z.string().optional(),
  active: z.boolean(),
  priority: z.string(),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  rule: GeofenceAlertRuleRow | null;
  geofences: { id: bigint; name: string }[];
  alertTypes: { id: number; name: string; category: string | null }[];
  onClose: () => void;
  onSuccess: () => void;
}

const NOTIFICATION_CHANNELS = ['email', 'sms', 'push', 'webhook'] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GeofenceAlertRuleFormDialog({
  open,
  rule,
  geofences,
  alertTypes,
  onClose,
  onSuccess,
}: Props) {
  const isEdit = rule !== null;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      geofenceId: '',
      alertTypeId: '',
      conditionType: '',
      thresholdValue: '',
      thresholdUnit: '',
      cooldownPeriod: '',
      minimumDuration: '',
      notificationChannels: ['email'],
      webhookUrl: '',
      active: true,
      priority: '1',
    },
  });

  const notificationChannels = useWatch({ control: form.control, name: 'notificationChannels' });
  const showWebhookUrl = notificationChannels?.includes('webhook');

  useEffect(() => {
    if (!open) return;

    if (rule) {
      form.reset({
        geofenceId: String(rule.geofenceId),
        alertTypeId: String(rule.alertTypeId),
        conditionType: rule.conditionType ?? '',
        thresholdValue: rule.thresholdValue ?? '',
        thresholdUnit: rule.thresholdUnit ?? '',
        cooldownPeriod: rule.cooldownPeriod != null ? String(rule.cooldownPeriod) : '',
        minimumDuration: rule.minimumDuration != null ? String(rule.minimumDuration) : '',
        notificationChannels: rule.notificationChannels ?? ['email'],
        webhookUrl: rule.webhookUrl ?? '',
        active: rule.active ?? true,
        priority: rule.priority != null ? String(rule.priority) : '1',
      });
    } else {
      form.reset({
        geofenceId: '',
        alertTypeId: '',
        conditionType: '',
        thresholdValue: '',
        thresholdUnit: '',
        cooldownPeriod: '',
        minimumDuration: '',
        notificationChannels: ['email'],
        webhookUrl: '',
        active: true,
        priority: '1',
      });
    }
  }, [rule, open, form]);

  async function onSubmit(values: FormValues) {
    const payload = {
      geofenceId: values.geofenceId,
      alertTypeId: Number(values.alertTypeId),
      conditionType: values.conditionType || null,
      thresholdValue: values.thresholdValue || null,
      thresholdUnit: values.thresholdUnit || null,
      cooldownPeriod: values.cooldownPeriod ? Number(values.cooldownPeriod) : null,
      minimumDuration: values.minimumDuration ? Number(values.minimumDuration) : null,
      notificationChannels: values.notificationChannels,
      webhookUrl: values.webhookUrl || null,
      active: values.active,
      priority: Number(values.priority) || 1,
    };

    if (isEdit) {
      const result = await updateGeofenceAlertRuleAction({ id: String(rule!.id), ...payload });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Regla de alerta actualizada.');
    } else {
      const result = await createGeofenceAlertRuleAction(payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Regla de alerta creada.');
    }

    onSuccess();
  }

  // Group alert types by category
  const alertTypesByCategory = alertTypes.reduce<
    Record<string, { id: number; name: string }[]>
  >((acc, at) => {
    const cat = at.category ?? 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ id: at.id, name: at.name });
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Regla de Alerta' : 'Nueva Regla de Alerta'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Geofence */}
            <FormField
              control={form.control}
              name="geofenceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geocerca</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isEdit}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar geocerca..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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

            {/* Alert Type */}
            <FormField
              control={form.control}
              name="alertTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de alerta</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isEdit}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar tipo..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(alertTypesByCategory).map(([category, types]) => (
                        <SelectGroup key={category}>
                          <SelectLabel>{category}</SelectLabel>
                          {types.map((at) => (
                            <SelectItem key={at.id} value={String(at.id)}>
                              {at.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Condition Type */}
            <FormField
              control={form.control}
              name="conditionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de condición</FormLabel>
                  <FormControl>
                    <Input placeholder="ej. entry, exit, speed_over..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Threshold */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="thresholdValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Umbral (valor)</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" placeholder="100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="thresholdUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidad</FormLabel>
                    <FormControl>
                      <Input placeholder="m, km/h, min..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Cooldown / Min Duration */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="cooldownPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cooldown (min)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minimumDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración mínima (seg)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="60" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notification Channels */}
            <FormField
              control={form.control}
              name="notificationChannels"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Canales de notificación</FormLabel>
                  <div className="flex flex-wrap gap-4 pt-1">
                    {NOTIFICATION_CHANNELS.map((channel) => (
                      <div key={channel} className="flex items-center gap-2">
                        <Checkbox
                          id={`channel-${channel}`}
                          checked={field.value?.includes(channel)}
                          onCheckedChange={(checked) => {
                            const current = field.value ?? [];
                            field.onChange(
                              checked
                                ? [...current, channel]
                                : current.filter((c) => c !== channel)
                            );
                          }}
                        />
                        <label
                          htmlFor={`channel-${channel}`}
                          className="text-sm capitalize cursor-pointer"
                        >
                          {channel}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Webhook URL — conditional */}
            {showWebhookUrl && (
              <FormField
                control={form.control}
                name="webhookUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Webhook URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/webhook" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Priority */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridad (1–10)</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" max="10" {...field} />
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
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">Activo</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
