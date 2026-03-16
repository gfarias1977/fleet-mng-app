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
import { deleteAssetTypeAction } from '@/app/(main)/asset-types/actions';
import type { AssetType } from '@/data/asset-types';

interface Props {
  open: boolean;
  assetType: AssetType | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteAssetTypeDialog({ open, assetType, onClose, onSuccess }: Props) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (!assetType) return;
    setPending(true);
    const result = await deleteAssetTypeAction({ id: assetType.id });
    setPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Tipo de activo eliminado correctamente.');
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar Tipo de Activo</DialogTitle>
          <DialogDescription>
            ¿Está seguro que desea eliminar{' '}
            <span className="font-semibold">{assetType?.name}</span>? Esta acción no se puede
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
