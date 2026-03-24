'use client';

import { useState } from 'react';
import { format } from 'date-fns';
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
import { deleteTelemetryEventAction } from '@/app/(main)/telemetry-events/actions';
import type { TelemetryEventRow } from '@/data/telemetry-events';

interface Props {
  open: boolean;
  event: TelemetryEventRow | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteTelemetryEventDialog({ open, event, onClose, onSuccess }: Props) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (!event) return;
    setPending(true);
    const result = await deleteTelemetryEventAction({ id: String(event.id) });
    setPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Evento eliminado correctamente.');
    onSuccess();
  }

  const formattedDate = event
    ? format(new Date(event.eventTimestamp), "do MMM yyyy, HH:mm")
    : '';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar Evento de Telemetría</DialogTitle>
          <DialogDescription>
            ¿Está seguro de eliminar el evento del{' '}
            <span className="font-semibold">{event?.deviceName}</span>{' '}
            registrado el{' '}
            <span className="font-semibold">{formattedDate}</span>?{' '}
            Esta acción no se puede deshacer.
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
