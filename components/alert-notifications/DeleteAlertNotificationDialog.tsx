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
import { deleteAlertNotificationAction } from '@/app/(main)/alert-notifications/actions';
import type { AlertNotificationRow } from '@/data/alert-notifications';

interface Props {
  open: boolean;
  notification: AlertNotificationRow | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteAlertNotificationDialog({
  open,
  notification,
  onClose,
  onSuccess,
}: Props) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (!notification) return;
    setPending(true);
    const result = await deleteAlertNotificationAction({ id: String(notification.id) });
    setPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Notificación eliminada correctamente.');
    onSuccess();
  }

  const methodLabel = notification?.notificationMethod
    ? notification.notificationMethod.toUpperCase()
    : '—';

  const destinationLabel = notification?.destination ?? '—';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar Notificación</DialogTitle>
          <DialogDescription>
            ¿Está seguro que desea eliminar la notificación{' '}
            <span className="font-semibold">{methodLabel}</span> hacia{' '}
            <span className="font-semibold">{destinationLabel}</span>? Esta acción no se
            puede deshacer.
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
