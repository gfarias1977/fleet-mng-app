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
import { deleteAssignmentAction } from '@/app/(main)/geofences/assignment-actions';
import type { AssignmentRow } from '@/data/asset-geofence-assignments';

interface Props {
  open: boolean;
  assignment: AssignmentRow | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteAssignmentDialog({ open, assignment, onClose, onSuccess }: Props) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (!assignment) return;
    setPending(true);
    const result = await deleteAssignmentAction({ id: assignment.id });
    setPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Asignación eliminada correctamente.');
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar Asignación</DialogTitle>
          <DialogDescription>
            ¿Está seguro que desea eliminar la asignación del activo{' '}
            <span className="font-semibold">{assignment?.assetNumber}</span>? Esta acción no se
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
