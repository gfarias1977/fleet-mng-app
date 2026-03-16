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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { createSensorAction, updateSensorAction } from '@/app/(main)/sensors/actions';
import type { SensorRow } from '@/data/sensors';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  stId: z.number().int().positive('Tipo de sensor requerido'),
  name: z.string().min(1, 'Nombre requerido').max(150),
  brand: z.string().max(50).optional().nullable(),
  model: z.string().max(50).optional().nullable(),
  status: z.enum(['active', 'inactive']),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  sensor: SensorRow | null;
  sensorTypes: { id: number; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SensorFormDialog({ open, sensor, sensorTypes, onClose, onSuccess }: Props) {
  const isEdit = sensor !== null;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      stId: 0,
      name: '',
      brand: '',
      model: '',
      status: 'active',
    },
  });

  useEffect(() => {
    if (!open) return;

    if (sensor) {
      form.reset({
        stId: sensor.stId,
        name: sensor.name,
        brand: sensor.brand ?? '',
        model: sensor.model ?? '',
        status: sensor.status,
      });
    } else {
      form.reset({
        stId: 0,
        name: '',
        brand: '',
        model: '',
        status: 'active',
      });
    }
  }, [sensor, open, form]);

  async function onSubmit(values: FormValues) {
    if (isEdit) {
      const result = await updateSensorAction({
        id: sensor!.id,
        stId: values.stId,
        name: values.name,
        brand: values.brand || null,
        model: values.model || null,
        status: values.status,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Sensor actualizado correctamente.');
    } else {
      const result = await createSensorAction({
        stId: values.stId,
        name: values.name,
        brand: values.brand || null,
        model: values.model || null,
        status: values.status,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Sensor creado correctamente.');
    }

    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Sensor' : 'Nuevo Sensor'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Sensor de temperatura" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sensor Type */}
            <FormField
              control={form.control}
              name="stId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Sensor</FormLabel>
                  <Select
                    value={field.value ? String(field.value) : ''}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sensorTypes.map((st) => (
                        <SelectItem key={st.id} value={String(st.id)}>
                          {st.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Brand */}
            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Bosch (opcional)" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Model */}
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. T-100 (opcional)" {...field} value={field.value ?? ''} />
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
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">Activo</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value === 'active'}
                      onCheckedChange={(checked) =>
                        field.onChange(checked ? 'active' : 'inactive')
                      }
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
