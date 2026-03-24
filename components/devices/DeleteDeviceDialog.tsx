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
import { deleteDeviceAction } from '@/app/(main)/devices/actions';
import type { DeviceRow } from '@/data/devices';

interface Props {
  open: boolean;
  device: DeviceRow | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteDeviceDialog({ open, device, onClose, onSuccess }: Props) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (!device) return;
    setPending(true);
    const result = await deleteDeviceAction({ id: String(device.id) });
    setPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Dispositivo eliminado correctamente.');
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar Dispositivo</DialogTitle>
          <DialogDescription>
            ¿Está seguro de eliminar el dispositivo{' '}
            <span className="font-semibold">{device?.name}</span>{' '}
            (S/N: {device?.serialNumber})? Esta acción no se puede deshacer.
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
