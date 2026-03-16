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
import { deleteGeofenceTypeAction } from '@/app/(main)/geofence-types/actions';
import type { GeofenceType } from '@/data/geofence-types';

interface Props {
  open: boolean;
  geofenceType: GeofenceType | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteGeofenceTypeDialog({ open, geofenceType, onClose, onSuccess }: Props) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (!geofenceType) return;
    setPending(true);
    const result = await deleteGeofenceTypeAction({ id: geofenceType.id });
    setPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Geofence type deleted successfully.');
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Geofence Type</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{' '}
            <span className="font-semibold">{geofenceType?.name}</span>? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={pending}>
            {pending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
