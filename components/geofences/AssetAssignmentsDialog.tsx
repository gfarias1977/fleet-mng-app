'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Plus, ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { getAssignmentsAction } from '@/app/(main)/geofences/assignment-actions';
import type { AssignmentRow, AssignmentSortField } from '@/data/asset-geofence-assignments';
import type { PaginatedResult } from '@/data/geofences';
import { DeleteAssignmentDialog } from './DeleteAssignmentDialog';
import { AddAssignmentDialog } from './AddAssignmentDialog';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date | null | undefined): string {
  if (!date) return '—';
  return format(new Date(date), 'do MMM yyyy HH:mm');
}

function BoolBadge({ value }: { value: boolean | null | undefined }) {
  if (value === null || value === undefined) return <>—</>;
  return <Badge variant={value ? 'default' : 'secondary'}>{value ? 'Sí' : 'No'}</Badge>;
}

type SortDir = 'asc' | 'desc';

interface SortIconProps {
  field: AssignmentSortField;
  currentSort: AssignmentSortField;
  currentOrder: SortDir;
}

function SortIcon({ field, currentSort, currentOrder }: SortIconProps) {
  if (currentSort !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
  if (currentOrder === 'asc') return <ArrowUp className="ml-1 h-3 w-3" />;
  return <ArrowDown className="ml-1 h-3 w-3" />;
}

interface SortableHeaderProps {
  field: AssignmentSortField;
  currentSort: AssignmentSortField;
  currentOrder: SortDir;
  onSort: (field: AssignmentSortField) => void;
  children: React.ReactNode;
}

function SortableHeader({ field, currentSort, currentOrder, onSort, children }: SortableHeaderProps) {
  return (
    <button
      className="flex items-center font-medium hover:text-foreground"
      onClick={() => onSort(field)}
    >
      {children}
      <SortIcon field={field} currentSort={currentSort} currentOrder={currentOrder} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  geofenceId: string | null;
  geofenceName: string;
  onClose: () => void;
}

export function AssetAssignmentsDialog({ open, geofenceId, geofenceName, onClose }: Props) {
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState<AssignmentSortField>('assetNumber');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [data, setData] = useState<PaginatedResult<AssignmentRow> | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    assignment: AssignmentRow | null;
  }>({ open: false, assignment: null });

  const [addDialog, setAddDialog] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchValue), 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // Fetch data
  const fetchData = useCallback(() => {
    if (!open || !geofenceId) return;
    startTransition(async () => {
      const result = await getAssignmentsAction({
        geofenceId,
        page: String(page),
        pageSize: '10',
        search: debouncedSearch || undefined,
        sortField,
        sortDir,
      });
      if (result.success) {
        setData(result.data);
      } else {
        toast.error(result.error);
      }
    });
  }, [open, geofenceId, page, debouncedSearch, sortField, sortDir]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  function handleClose() {
    setPage(1);
    setSearchValue('');
    setDebouncedSearch('');
    setSortField('assetNumber');
    setSortDir('asc');
    setData(null);
    setRefreshKey(0);
    onClose();
  }

  function handleSort(field: AssignmentSortField) {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  }

  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ?? 1;
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 10;

  function buildPageItems() {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
      .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
        if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
          acc.push('ellipsis');
        }
        acc.push(p);
        return acc;
      }, []);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Activos Asignados — {geofenceName}</DialogTitle>
          </DialogHeader>

          {isPending && <Progress className="h-1 w-full" />}

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4">
            <Input
              placeholder="Buscar activos..."
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                setPage(1);
              }}
              className="max-w-xs"
            />
            <Button onClick={() => setAddDialog(true)} disabled={!geofenceId}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Activo
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortableHeader field="assetNumber" currentSort={sortField} currentOrder={sortDir} onSort={handleSort}>
                      Número
                    </SortableHeader>
                  </TableHead>
                  <TableHead>
                    <SortableHeader field="assetTypeName" currentSort={sortField} currentOrder={sortDir} onSort={handleSort}>
                      Tipo
                    </SortableHeader>
                  </TableHead>
                  <TableHead>
                    <SortableHeader field="assetStatus" currentSort={sortField} currentOrder={sortDir} onSort={handleSort}>
                      Estado
                    </SortableHeader>
                  </TableHead>
                  <TableHead>
                    <SortableHeader field="isActive" currentSort={sortField} currentOrder={sortDir} onSort={handleSort}>
                      Asig. Activa
                    </SortableHeader>
                  </TableHead>
                  <TableHead>
                    <SortableHeader field="priority" currentSort={sortField} currentOrder={sortDir} onSort={handleSort}>
                      Prioridad
                    </SortableHeader>
                  </TableHead>
                  <TableHead>Alerta Entrada</TableHead>
                  <TableHead>Alerta Salida</TableHead>
                  <TableHead>Alerta Permanencia</TableHead>
                  <TableHead>
                    <SortableHeader field="validFrom" currentSort={sortField} currentOrder={sortDir} onSort={handleSort}>
                      Válido Desde
                    </SortableHeader>
                  </TableHead>
                  <TableHead>
                    <SortableHeader field="validUntil" currentSort={sortField} currentOrder={sortDir} onSort={handleSort}>
                      Válido Hasta
                    </SortableHeader>
                  </TableHead>
                  <TableHead>
                    <SortableHeader field="createdAt" currentSort={sortField} currentOrder={sortDir} onSort={handleSort}>
                      Creado
                    </SortableHeader>
                  </TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data || data.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-10 text-muted-foreground">
                      {isPending ? 'Cargando…' : 'No hay activos asignados a esta geocerca.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  data.data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.assetNumber}</TableCell>
                      <TableCell>{row.assetTypeName}</TableCell>
                      <TableCell>
                        <Badge variant={row.assetStatus === 'active' ? 'default' : 'secondary'}>
                          {row.assetStatus === 'active' ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell><BoolBadge value={row.isActive} /></TableCell>
                      <TableCell>{row.priority ?? '—'}</TableCell>
                      <TableCell><BoolBadge value={row.alertOnEntry} /></TableCell>
                      <TableCell><BoolBadge value={row.alertOnExit} /></TableCell>
                      <TableCell><BoolBadge value={row.alertOnDwell} /></TableCell>
                      <TableCell className="text-sm">{formatDate(row.validFrom)}</TableCell>
                      <TableCell className="text-sm">{formatDate(row.validUntil)}</TableCell>
                      <TableCell className="text-sm">{formatDate(row.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Eliminar"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteDialog({ open: true, assignment: row })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, total)} de{' '}
                {total}
              </span>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={currentPage > 1 ? () => setPage(currentPage - 1) : undefined}
                      aria-disabled={currentPage <= 1}
                      className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>

                  {buildPageItems().map((item, idx) =>
                    item === 'ellipsis' ? (
                      <PaginationItem key={`ellipsis-${idx}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={item}>
                        <PaginationLink
                          isActive={item === currentPage}
                          onClick={() => setPage(item)}
                          className="cursor-pointer"
                        >
                          {item}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={
                        currentPage < totalPages ? () => setPage(currentPage + 1) : undefined
                      }
                      aria-disabled={currentPage >= totalPages}
                      className={
                        currentPage >= totalPages
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Nested dialogs — rendered outside the main Dialog to avoid stacking issues */}
      <DeleteAssignmentDialog
        open={deleteDialog.open}
        assignment={deleteDialog.assignment}
        onClose={() => setDeleteDialog({ open: false, assignment: null })}
        onSuccess={() => {
          setDeleteDialog({ open: false, assignment: null });
          setRefreshKey((k) => k + 1);
        }}
      />

      <AddAssignmentDialog
        open={addDialog}
        geofenceId={geofenceId ?? ''}
        onClose={() => setAddDialog(false)}
        onSuccess={() => {
          setAddDialog(false);
          setRefreshKey((k) => k + 1);
        }}
      />
    </>
  );
}
