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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { createAlertTypeAction, updateAlertTypeAction } from '@/app/(main)/alert-types/actions';
import type { AlertType } from '@/data/alert-types';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(50),
  category: z.string().max(50).optional(),
  description: z.string().optional(),
  priority: z.number().int().min(1, 'Mínimo 1').max(10, 'Máximo 10'),
  requiresAcknowledgment: z.boolean(),
  defaultMessage: z.string().optional(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  alertType: AlertType | null;
  onClose: () => void;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AlertTypeFormDialog({ open, alertType, onClose, onSuccess }: Props) {
  const isEdit = alertType !== null;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      category: '',
      description: '',
      priority: 1,
      requiresAcknowledgment: false,
      defaultMessage: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (!open) return;

    if (alertType) {
      form.reset({
        name: alertType.name,
        category: alertType.category ?? '',
        description: alertType.description ?? '',
        priority: alertType.priority ?? 1,
        requiresAcknowledgment: alertType.requiresAcknowledgment ?? false,
        defaultMessage: alertType.defaultMessage ?? '',
        isActive: alertType.isActive ?? true,
      });
    } else {
      form.reset({
        name: '',
        category: '',
        description: '',
        priority: 1,
        requiresAcknowledgment: false,
        defaultMessage: '',
        isActive: true,
      });
    }
  }, [alertType, open, form]);

  async function onSubmit(values: FormValues) {
    if (isEdit) {
      const result = await updateAlertTypeAction({
        id: alertType!.id,
        name: values.name,
        category: values.category || null,
        description: values.description || null,
        priority: values.priority,
        requiresAcknowledgment: values.requiresAcknowledgment,
        defaultMessage: values.defaultMessage || null,
        isActive: values.isActive,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Tipo de alerta actualizado correctamente.');
    } else {
      const result = await createAlertTypeAction({
        name: values.name,
        category: values.category || null,
        description: values.description || null,
        priority: values.priority,
        requiresAcknowledgment: values.requiresAcknowledgment,
        defaultMessage: values.defaultMessage || null,
        isActive: values.isActive,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Tipo de alerta creado correctamente.');
    }

    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Tipo de Alerta' : 'Nuevo Tipo de Alerta'}</DialogTitle>
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
                    <Input placeholder="ej. Velocidad excedida" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <FormControl>
                    <Input placeholder="ej. Seguridad" {...field} />
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
                    <Textarea placeholder="Descripción opcional..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridad (1–10)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Default Message */}
            <FormField
              control={form.control}
              name="defaultMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensaje por defecto</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Mensaje predeterminado de la alerta..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Requires Acknowledgment */}
            <FormField
              control={form.control}
              name="requiresAcknowledgment"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">Requiere confirmación</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Active */}
            <FormField
              control={form.control}
              name="isActive"
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
