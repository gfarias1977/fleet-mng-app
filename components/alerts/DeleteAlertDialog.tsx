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
import { deleteAlertAction } from '@/app/(main)/alerts/actions';
import type { AlertListRow } from '@/data/alerts';

interface Props {
  open: boolean;
  alert: AlertListRow | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteAlertDialog({ open, alert, onClose, onSuccess }: Props) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (!alert) return;
    setPending(true);
    const result = await deleteAlertAction({
      id: String(alert.id),
      alertTimestamp: alert.alertTimestamp.toISOString(),
    });
    setPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Alerta eliminada correctamente.');
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar Alerta</DialogTitle>
          <DialogDescription>
            ¿Está seguro que desea eliminar la alerta de tipo{' '}
            <span className="font-semibold">{alert?.alertTypeName}</span> del dispositivo{' '}
            <span className="font-semibold">{alert?.deviceName}</span>? Esta acción no se puede
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
