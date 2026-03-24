'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { toast } from 'sonner';
import { Unlink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getDevicesForAssetAction,
  getAvailableDevicesAction,
  assignDeviceAction,
  unassignDeviceAction,
} from '@/app/(main)/assets/actions';
import type { AssignedDevice } from '@/data/assets';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  assetId: number | null;
  assetNumber: string;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DeviceAssignmentDialog({ open, assetId, assetNumber, onClose }: Props) {
  const [assignedDevices, setAssignedDevices] = useState<AssignedDevice[]>([]);
  const [availableDevices, setAvailableDevices] = useState<AssignedDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  const fetchData = useCallback(() => {
    if (!open || !assetId) return;
    startTransition(async () => {
      const [devicesResult, availableResult] = await Promise.all([
        getDevicesForAssetAction(String(assetId)),
        getAvailableDevicesAction(),
      ]);

      if (devicesResult.success) {
        setAssignedDevices(devicesResult.data);
      } else {
        toast.error(devicesResult.error);
      }

      if (availableResult.success) {
        setAvailableDevices(availableResult.data);
      } else {
        toast.error(availableResult.error);
      }
    });
  }, [open, assetId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  function handleClose() {
    setAssignedDevices([]);
    setAvailableDevices([]);
    setSelectedDeviceId('');
    setRefreshKey(0);
    onClose();
  }

  async function handleAssign() {
    if (!selectedDeviceId || !assetId) return;
    const result = await assignDeviceAction({ deviceId: selectedDeviceId, assetId });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Dispositivo asignado correctamente.');
    setSelectedDeviceId('');
    setRefreshKey((k) => k + 1);
  }

  async function handleUnassign(deviceId: bigint) {
    const result = await unassignDeviceAction({ deviceId: String(deviceId) });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Dispositivo desasignado correctamente.');
    setRefreshKey((k) => k + 1);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Dispositivos — {assetNumber}</DialogTitle>
        </DialogHeader>

        {isPending && <Progress className="h-1 w-full" />}

        {/* Assign toolbar */}
        <div className="flex items-center gap-2">
          <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Seleccionar dispositivo disponible…" />
            </SelectTrigger>
            <SelectContent>
              {availableDevices.length === 0 ? (
                <SelectItem value="_none" disabled>
                  Sin dispositivos disponibles
                </SelectItem>
              ) : (
                availableDevices.map((d) => (
                  <SelectItem key={String(d.id)} value={String(d.id)}>
                    {d.name} ({d.serialNumber})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAssign}
            disabled={!selectedDeviceId || selectedDeviceId === '_none' || isPending}
          >
            Asignar
          </Button>
        </div>

        {/* Assigned devices table */}
        <div className="rounded-md border overflow-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número de Serie</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isPending && assignedDevices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    No hay dispositivos asignados a este activo.
                  </TableCell>
                </TableRow>
              ) : (
                assignedDevices.map((device) => (
                  <TableRow key={String(device.id)}>
                    <TableCell className="font-medium">{device.serialNumber}</TableCell>
                    <TableCell>{device.name}</TableCell>
                    <TableCell>
                      <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                        {device.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Desasignar"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleUnassign(device.id)}
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
