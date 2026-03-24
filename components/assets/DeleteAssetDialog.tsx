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
import { deleteAssetAction } from '@/app/(main)/assets/actions';
import type { AssetRow } from '@/data/assets';

interface Props {
  open: boolean;
  asset: AssetRow | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteAssetDialog({ open, asset, onClose, onSuccess }: Props) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (!asset) return;
    setPending(true);
    const result = await deleteAssetAction({ id: asset.id });
    setPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Activo eliminado correctamente.');
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar Activo</DialogTitle>
          <DialogDescription>
            ¿Está seguro de eliminar el activo{' '}
            <span className="font-semibold">{asset?.number}</span>? Esta acción no se puede
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
