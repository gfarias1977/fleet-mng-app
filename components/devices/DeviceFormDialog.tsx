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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createDeviceAction, updateDeviceAction } from '@/app/(main)/devices/actions';
import type { DeviceRow } from '@/data/devices';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  serialNumber: z.string().min(1, 'Número de serie requerido').max(100),
  name: z.string().min(1, 'Nombre requerido').max(100),
  deviceTypeId: z.string().min(1, 'Tipo de dispositivo requerido'),
  assetId: z.string().optional(),
  brand: z.string().max(50).optional(),
  model: z.string().max(50).optional(),
  gateway: z.string().max(100).optional(),
  macAddress: z.string().max(17).optional(),
  active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  device: DeviceRow | null;
  deviceTypes: { id: number; name: string }[];
  assets: { id: number; number: string }[];
  onClose: () => void;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DeviceFormDialog({ open, device, deviceTypes, assets, onClose, onSuccess }: Props) {
  const isEdit = device !== null;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      serialNumber: '',
      name: '',
      deviceTypeId: '',
      assetId: '',
      brand: '',
      model: '',
      gateway: '',
      macAddress: '',
      active: true,
    },
  });

  useEffect(() => {
    if (!open) return;

    if (device) {
      form.reset({
        serialNumber: device.serialNumber,
        name: device.name,
        deviceTypeId: String(device.deviceTypeId),
        assetId: device.assetId ? String(device.assetId) : '',
        brand: device.brand ?? '',
        model: device.model ?? '',
        gateway: '',
        macAddress: device.macAddress ?? '',
        active: device.active,
      });
    } else {
      form.reset({
        serialNumber: '',
        name: '',
        deviceTypeId: '',
        assetId: '',
        brand: '',
        model: '',
        gateway: '',
        macAddress: '',
        active: true,
      });
    }
  }, [device, open, form]);

  async function onSubmit(values: FormValues) {
    const assetId = values.assetId && values.assetId !== '__none__'
      ? Number(values.assetId)
      : null;

    if (isEdit) {
      const result = await updateDeviceAction({
        id: String(device!.id),
        serialNumber: values.serialNumber,
        name: values.name,
        deviceTypeId: Number(values.deviceTypeId),
        assetId,
        brand: values.brand || null,
        model: values.model || null,
        gateway: values.gateway || null,
        macAddress: values.macAddress || null,
        active: values.active,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Dispositivo actualizado correctamente.');
    } else {
      const result = await createDeviceAction({
        serialNumber: values.serialNumber,
        name: values.name,
        deviceTypeId: Number(values.deviceTypeId),
        assetId,
        brand: values.brand || null,
        model: values.model || null,
        gateway: values.gateway || null,
        macAddress: values.macAddress || null,
        active: values.active,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Dispositivo creado correctamente.');
    }

    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Dispositivo' : 'Nuevo Dispositivo'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Serial Number */}
            <FormField
              control={form.control}
              name="serialNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Serie</FormLabel>
                  <FormControl>
                    <Input placeholder="ej. SN-001234" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="ej. Tracker Principal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Device Type */}
            <FormField
              control={form.control}
              name="deviceTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Dispositivo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {deviceTypes.map((t) => (
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

            {/* Asset */}
            <FormField
              control={form.control}
              name="assetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activo (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin activo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Sin activo</SelectItem>
                      {assets.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.number}
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
                    <Input placeholder="ej. Teltonika" {...field} />
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
                    <Input placeholder="ej. FMB920" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Gateway */}
            <FormField
              control={form.control}
              name="gateway"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gateway</FormLabel>
                  <FormControl>
                    <Input placeholder="ej. 192.168.1.1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* MAC Address */}
            <FormField
              control={form.control}
              name="macAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección MAC</FormLabel>
                  <FormControl>
                    <Input placeholder="ej. AA:BB:CC:DD:EE:FF" {...field} />
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
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <FormLabel className="mb-0">Habilitado</FormLabel>
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
