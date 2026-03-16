'use client';

import { useEffect, useState, KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { X } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { createDeviceTypeAction, updateDeviceTypeAction } from '@/app/(main)/device-types/actions';
import type { DeviceType } from '@/data/device-types';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(50),
  description: z.string().optional(),
  capabilities: z.array(z.string()),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  deviceType: DeviceType | null;
  onClose: () => void;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DeviceTypeFormDialog({ open, deviceType, onClose, onSuccess }: Props) {
  const isEdit = deviceType !== null;
  const [capInput, setCapInput] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      capabilities: [],
      isActive: true,
    },
  });

  useEffect(() => {
    if (!open) return;

    if (deviceType) {
      form.reset({
        name: deviceType.name,
        description: deviceType.description ?? '',
        capabilities: deviceType.capabilities ?? [],
        isActive: deviceType.isActive ?? true,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        capabilities: [],
        isActive: true,
      });
    }
    setCapInput('');
  }, [deviceType, open, form]);

  function addCapability(value: string, currentCaps: string[], onChange: (v: string[]) => void) {
    const trimmed = value.trim().replace(/,$/, '').trim();
    if (trimmed && !currentCaps.includes(trimmed)) {
      onChange([...currentCaps, trimmed]);
    }
    setCapInput('');
  }

  function handleCapKeyDown(
    e: KeyboardEvent<HTMLInputElement>,
    currentCaps: string[],
    onChange: (v: string[]) => void
  ) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addCapability(capInput, currentCaps, onChange);
    }
  }

  function removeCapability(cap: string, currentCaps: string[], onChange: (v: string[]) => void) {
    onChange(currentCaps.filter((c) => c !== cap));
  }

  async function onSubmit(values: FormValues) {
    if (isEdit) {
      const result = await updateDeviceTypeAction({
        id: deviceType!.id,
        name: values.name,
        description: values.description || null,
        capabilities: values.capabilities,
        isActive: values.isActive,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Tipo de dispositivo actualizado correctamente.');
    } else {
      const result = await createDeviceTypeAction({
        name: values.name,
        description: values.description || null,
        capabilities: values.capabilities,
        isActive: values.isActive,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Tipo de dispositivo creado correctamente.');
    }

    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Tipo de Dispositivo' : 'Nuevo Tipo de Dispositivo'}
          </DialogTitle>
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
                    <Input placeholder="ej. GPS Tracker" {...field} />
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

            {/* Capabilities */}
            <FormField
              control={form.control}
              name="capabilities"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacidades</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        placeholder="Escribe y presiona Enter o coma para añadir..."
                        value={capInput}
                        onChange={(e) => setCapInput(e.target.value)}
                        onKeyDown={(e) =>
                          handleCapKeyDown(e, field.value, field.onChange)
                        }
                        onBlur={() => {
                          if (capInput.trim()) {
                            addCapability(capInput, field.value, field.onChange);
                          }
                        }}
                      />
                      {field.value.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {field.value.map((cap) => (
                            <Badge key={cap} variant="secondary" className="gap-1 pr-1">
                              {cap}
                              <button
                                type="button"
                                onClick={() =>
                                  removeCapability(cap, field.value, field.onChange)
                                }
                                className="ml-1 rounded-full hover:bg-muted-foreground/20"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
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
