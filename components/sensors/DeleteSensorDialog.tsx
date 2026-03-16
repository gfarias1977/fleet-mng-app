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
import { deleteSensorAction } from '@/app/(main)/sensors/actions';
import type { SensorRow } from '@/data/sensors';

interface Props {
  open: boolean;
  sensor: SensorRow | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteSensorDialog({ open, sensor, onClose, onSuccess }: Props) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (!sensor) return;
    setPending(true);
    const result = await deleteSensorAction({ id: sensor.id });
    setPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Sensor eliminado correctamente.');
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar Sensor</DialogTitle>
          <DialogDescription>
            ¿Estás seguro que deseas eliminar{' '}
            <span className="font-semibold">{sensor?.name}</span>? Esta acción no se puede
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
