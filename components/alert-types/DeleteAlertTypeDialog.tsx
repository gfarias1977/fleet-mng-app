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
import { deleteAlertTypeAction } from '@/app/(main)/alert-types/actions';
import type { AlertType } from '@/data/alert-types';

interface Props {
  open: boolean;
  alertType: AlertType | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteAlertTypeDialog({ open, alertType, onClose, onSuccess }: Props) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (!alertType) return;
    setPending(true);
    const result = await deleteAlertTypeAction({ id: alertType.id });
    setPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Tipo de alerta eliminado correctamente.');
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar Tipo de Alerta</DialogTitle>
          <DialogDescription>
            ¿Está seguro que desea eliminar{' '}
            <span className="font-semibold">{alertType?.name}</span>? Esta acción no se puede
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
