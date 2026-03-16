'use client';

import { useEffect, useTransition, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  getAvailableAssetsAction,
  createAssignmentAction,
} from '@/app/(main)/geofences/assignment-actions';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  assetId: z.string().min(1, 'Seleccione un activo'),
  isActive: z.boolean(),
  priority: z.coerce.number().int().min(0).max(100),
  alertOnEntry: z.boolean(),
  alertOnExit: z.boolean(),
  alertOnDwell: z.boolean(),
  dwellTimeThreshold: z.coerce.number().int().min(0).nullish(),
  validFrom: z.string().min(1, 'Fecha de inicio requerida'),
  validUntil: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AssetOption {
  id: string;
  number: string;
  typeName: string;
}

interface Props {
  open: boolean;
  geofenceId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddAssignmentDialog({ open, geofenceId, onClose, onSuccess }: Props) {
  const [availableAssets, setAvailableAssets] = useState<AssetOption[]>([]);
  const [loadingAssets, startLoadingAssets] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      assetId: '',
      isActive: true,
      priority: 0,
      alertOnEntry: true,
      alertOnExit: true,
      alertOnDwell: false,
      dwellTimeThreshold: undefined,
      validFrom: '',
      validUntil: '',
    },
  });

  const watchAlertOnDwell = form.watch('alertOnDwell');

  useEffect(() => {
    if (!open) {
      form.reset();
      setAvailableAssets([]);
      return;
    }
    startLoadingAssets(async () => {
      const result = await getAvailableAssetsAction({ geofenceId });
      if (result.success) {
        setAvailableAssets(result.data);
      } else {
        toast.error(result.error);
      }
    });
  }, [open, geofenceId, form]);

  async function onSubmit(values: FormValues) {
    const result = await createAssignmentAction({
      geofenceId,
      assetId: values.assetId,
      isActive: values.isActive,
      priority: values.priority,
      alertOnEntry: values.alertOnEntry,
      alertOnExit: values.alertOnExit,
      alertOnDwell: values.alertOnDwell,
      dwellTimeThreshold: values.dwellTimeThreshold ?? null,
      validFrom: values.validFrom,
      validUntil: values.validUntil || undefined,
    });

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Activo asignado correctamente.');
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agregar Activo a Geocerca</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Left column */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="assetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activo</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={loadingAssets}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={loadingAssets ? 'Cargando…' : 'Seleccione un activo'}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableAssets.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.number} — {a.typeName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="validFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Válido Desde</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="validUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Válido Hasta (opcional)</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridad (0–100)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={100} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Right column */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel className="mb-0">Asignación Activa</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="alertOnEntry"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel className="mb-0">Alerta al Entrar</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="alertOnExit"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel className="mb-0">Alerta al Salir</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="alertOnDwell"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel className="mb-0">Alerta por Permanencia</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {watchAlertOnDwell && (
                  <FormField
                    control={form.control}
                    name="dwellTimeThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Umbral Permanencia (segundos)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value === '' ? null : e.target.value)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={form.formState.isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || loadingAssets}>
                {form.formState.isSubmitting ? 'Guardando…' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
