'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getAlertRulesForGeofenceAction,
  getAlertTypesAction,
} from '@/app/(main)/geofence-alert-rules/actions';
import type { GeofenceAlertRuleRow } from '@/data/geofence-alert-rules';
import { GeofenceAlertRuleFormDialog } from '@/components/geofence-alert-rules/GeofenceAlertRuleFormDialog';
import { DeleteGeofenceAlertRuleDialog } from '@/components/geofence-alert-rules/DeleteGeofenceAlertRuleDialog';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  geofenceId: string | null;
  geofenceName: string;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GeofenceAlertRulesDialog({ open, geofenceId, geofenceName, onClose }: Props) {
  const [rules, setRules] = useState<GeofenceAlertRuleRow[]>([]);
  const [alertTypes, setAlertTypes] = useState<{ id: number; name: string; category: string | null }[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  const [formDialog, setFormDialog] = useState<{
    open: boolean;
    rule: GeofenceAlertRuleRow | null;
  }>({ open: false, rule: null });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    rule: GeofenceAlertRuleRow | null;
  }>({ open: false, rule: null });

  const fetchData = useCallback(() => {
    if (!open || !geofenceId) return;
    startTransition(async () => {
      const [rulesResult, typesResult] = await Promise.all([
        getAlertRulesForGeofenceAction({ geofenceId }),
        getAlertTypesAction(),
      ]);

      if (rulesResult.success) {
        setRules(rulesResult.data);
      } else {
        toast.error(rulesResult.error);
      }

      if (typesResult.success) {
        setAlertTypes(typesResult.data);
      } else {
        toast.error(typesResult.error);
      }
    });
  }, [open, geofenceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  function handleClose() {
    setRules([]);
    setAlertTypes([]);
    setRefreshKey(0);
    onClose();
  }

  const geofenceOption = geofenceId
    ? [{ id: BigInt(geofenceId), name: geofenceName }]
    : [];

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Reglas de Alerta — {geofenceName}</DialogTitle>
          </DialogHeader>

          {isPending && <Progress className="h-1 w-full" />}

          {/* Toolbar */}
          <div className="flex justify-end">
            <Button
              onClick={() => setFormDialog({ open: true, rule: null })}
              disabled={!geofenceId}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Regla
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Alerta</TableHead>
                  <TableHead>Condición</TableHead>
                  <TableHead>Umbral</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!isPending && rules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No hay reglas de alerta para esta geocerca.
                    </TableCell>
                  </TableRow>
                ) : (
                  rules.map((rule) => (
                    <TableRow key={String(rule.id)}>
                      <TableCell className="font-medium">{rule.alertTypeName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {rule.conditionType ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {rule.thresholdValue
                          ? `${rule.thresholdValue}${rule.thresholdUnit ? ' ' + rule.thresholdUnit : ''}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={rule.active ? 'default' : 'secondary'}>
                          {rule.active ? 'Sí' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>{rule.priority ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar"
                            onClick={() => setFormDialog({ open: true, rule })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Eliminar"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteDialog({ open: true, rule })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nested dialogs */}
      <GeofenceAlertRuleFormDialog
        open={formDialog.open}
        rule={formDialog.rule}
        geofences={geofenceOption}
        alertTypes={alertTypes}
        onClose={() => setFormDialog({ open: false, rule: null })}
        onSuccess={() => {
          setFormDialog({ open: false, rule: null });
          setRefreshKey((k) => k + 1);
        }}
      />

      <DeleteGeofenceAlertRuleDialog
        open={deleteDialog.open}
        rule={deleteDialog.rule}
        onClose={() => setDeleteDialog({ open: false, rule: null })}
        onSuccess={() => {
          setDeleteDialog({ open: false, rule: null });
          setRefreshKey((k) => k + 1);
        }}
      />
    </>
  );
}
