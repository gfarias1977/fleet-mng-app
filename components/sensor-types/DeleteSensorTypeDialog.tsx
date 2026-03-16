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
import { deleteSensorTypeAction } from '@/app/(main)/sensor-types/actions';
import type { SensorType } from '@/data/sensor-types';

interface Props {
  open: boolean;
  sensorType: SensorType | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteSensorTypeDialog({ open, sensorType, onClose, onSuccess }: Props) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (!sensorType) return;
    setPending(true);
    const result = await deleteSensorTypeAction({ id: sensorType.id });
    setPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Tipo de sensor eliminado correctamente.');
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar Tipo de Sensor</DialogTitle>
          <DialogDescription>
            ¿Está seguro que desea eliminar{' '}
            <span className="font-semibold">{sensorType?.name}</span>? Esta acción no se puede
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
