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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createAssetAction, updateAssetAction } from '@/app/(main)/assets/actions';
import type { AssetRow } from '@/data/assets';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  assetTypeId: z.string().min(1, 'Tipo de activo requerido'),
  number: z.string().min(1, 'Número requerido').max(150),
  status: z.enum(['active', 'inactive']),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  asset: AssetRow | null;
  assetTypes: { id: number; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AssetFormDialog({ open, asset, assetTypes, onClose, onSuccess }: Props) {
  const isEdit = asset !== null;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      assetTypeId: '',
      number: '',
      status: 'active' as const,
    },
  });

  useEffect(() => {
    if (!open) return;

    if (asset) {
      form.reset({
        assetTypeId: String(asset.assetTypeId),
        number: asset.number,
        status: asset.status,
      });
    } else {
      form.reset({
        assetTypeId: '',
        number: '',
        status: 'active',
      });
    }
  }, [asset, open, form]);

  async function onSubmit(values: FormValues) {
    if (isEdit) {
      const result = await updateAssetAction({
        id: asset!.id,
        assetTypeId: Number(values.assetTypeId),
        number: values.number,
        status: values.status,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Activo actualizado correctamente.');
    } else {
      const result = await createAssetAction({
        assetTypeId: Number(values.assetTypeId),
        number: values.number,
        status: values.status,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Activo creado correctamente.');
    }

    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Activo' : 'Nuevo Activo'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Asset Type */}
            <FormField
              control={form.control}
              name="assetTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Activo</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assetTypes.map((t) => (
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

            {/* Number */}
            <FormField
              control={form.control}
              name="number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número / Identificador</FormLabel>
                  <FormControl>
                    <Input placeholder="ej. VH-001" {...field} />
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
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
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
