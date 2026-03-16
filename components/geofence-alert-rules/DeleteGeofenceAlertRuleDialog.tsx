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
import { deleteGeofenceAlertRuleAction } from '@/app/(main)/geofence-alert-rules/actions';
import type { GeofenceAlertRuleRow } from '@/data/geofence-alert-rules';

interface Props {
  open: boolean;
  rule: GeofenceAlertRuleRow | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteGeofenceAlertRuleDialog({ open, rule, onClose, onSuccess }: Props) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (!rule) return;
    setPending(true);
    const result = await deleteGeofenceAlertRuleAction({ id: String(rule.id) });
    setPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Regla de alerta eliminada.');
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar Regla de Alerta</DialogTitle>
          <DialogDescription>
            ¿Está seguro de eliminar la regla de{' '}
            <span className="font-semibold">{rule?.geofenceName}</span> —{' '}
            <span className="font-semibold">{rule?.alertTypeName}</span>? Esta acción no se
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
