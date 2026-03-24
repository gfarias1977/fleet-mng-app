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
  getSensorsForDeviceAction,
  getAvailableSensorsAction,
  assignSensorAction,
  unassignSensorAction,
} from '@/app/(main)/devices/actions';
import type { DeviceSensorRow, SensorSelectRow } from '@/data/devices';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  deviceId: bigint | null;
  deviceName: string;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SensorAssignmentDialog({ open, deviceId, deviceName, onClose }: Props) {
  const [assignedSensors, setAssignedSensors] = useState<DeviceSensorRow[]>([]);
  const [availableSensors, setAvailableSensors] = useState<SensorSelectRow[]>([]);
  const [selectedSensorId, setSelectedSensorId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  const fetchData = useCallback(() => {
    if (!open || !deviceId) return;
    startTransition(async () => {
      const [sensorsResult, availableResult] = await Promise.all([
        getSensorsForDeviceAction(String(deviceId)),
        getAvailableSensorsAction(String(deviceId)),
      ]);

      if (sensorsResult.success) {
        setAssignedSensors(sensorsResult.data);
      } else {
        toast.error(sensorsResult.error);
      }

      if (availableResult.success) {
        setAvailableSensors(availableResult.data);
      } else {
        toast.error(availableResult.error);
      }
    });
  }, [open, deviceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  function handleClose() {
    setAssignedSensors([]);
    setAvailableSensors([]);
    setSelectedSensorId('');
    setRefreshKey(0);
    onClose();
  }

  async function handleAssign() {
    if (!selectedSensorId || !deviceId) return;
    const result = await assignSensorAction({
      deviceId: String(deviceId),
      sensorId: Number(selectedSensorId),
    });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Sensor asignado correctamente.');
    setSelectedSensorId('');
    setRefreshKey((k) => k + 1);
  }

  async function handleUnassign(sensorId: number) {
    if (!deviceId) return;
    const result = await unassignSensorAction({
      deviceId: String(deviceId),
      sensorId,
    });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Sensor desasignado correctamente.');
    setRefreshKey((k) => k + 1);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Sensores — {deviceName}</DialogTitle>
        </DialogHeader>

        {isPending && <Progress className="h-1 w-full" />}

        {/* Assign toolbar */}
        <div className="flex items-center gap-2">
          <Select value={selectedSensorId} onValueChange={setSelectedSensorId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Seleccionar sensor disponible…" />
            </SelectTrigger>
            <SelectContent>
              {availableSensors.length === 0 ? (
                <SelectItem value="_none" disabled>
                  Sin sensores disponibles
                </SelectItem>
              ) : (
                availableSensors.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name} ({s.sensorTypeName})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAssign}
            disabled={!selectedSensorId || selectedSensorId === '_none' || isPending}
          >
            Asignar
          </Button>
        </div>

        {/* Assigned sensors table */}
        <div className="rounded-md border overflow-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre Sensor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Nombre Personalizado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isPending && assignedSensors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No hay sensores asignados a este dispositivo.
                  </TableCell>
                </TableRow>
              ) : (
                assignedSensors.map((sensor) => (
                  <TableRow key={String(sensor.id)}>
                    <TableCell className="font-medium">{sensor.sensorName}</TableCell>
                    <TableCell>{sensor.sensorTypeName}</TableCell>
                    <TableCell>{sensor.customName ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={sensor.enabled ? 'default' : 'secondary'}>
                        {sensor.enabled ? 'Habilitado' : 'Deshabilitado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Desasignar"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleUnassign(sensor.sensorId)}
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
