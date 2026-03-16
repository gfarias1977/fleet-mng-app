'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { deleteDeviceTypeAction } from '@/app/(main)/device-types/actions';
import type { DeviceType } from '@/data/device-types';

interface Props {
  open: boolean;
  deviceType: DeviceType | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteDeviceTypeDialog({ open, deviceType, onClose, onSuccess }: Props) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (!deviceType) return;
    setPending(true);
    const result = await deleteDeviceTypeAction({ id: deviceType.id });
    setPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Tipo de dispositivo eliminado correctamente.');
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar Tipo de Dispositivo</DialogTitle>
          <DialogDescription>
            ¿Está seguro que desea eliminar{' '}
            <span className="font-semibold">{deviceType?.name}</span>? Esta acción no se puede
            deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={pending}>
            {pending ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
