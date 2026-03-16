'use client';

import { useCallback, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react';
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
import type {
  PaginatedResult,
  GeofenceAlertRuleRow,
  GeofenceAlertRuleSortField,
} from '@/data/geofence-alert-rules';
import { GeofenceAlertRuleFormDialog } from './GeofenceAlertRuleFormDialog';
import { DeleteGeofenceAlertRuleDialog } from './DeleteGeofenceAlertRuleDialog';

interface Props {
  initialData: PaginatedResult<GeofenceAlertRuleRow>;
  geofences: { id: bigint; name: string }[];
  alertTypes: { id: number; name: string; category: string | null }[];
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return '—';
  return format(new Date(date), 'do MMM yyyy, HH:mm');
}

type SortDir = 'asc' | 'desc';

export function GeofenceAlertRulesClient({ initialData, geofences, alertTypes }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [formDialog, setFormDialog] = useState<{
    open: boolean;
    rule: GeofenceAlertRuleRow | null;
  }>({ open: false, rule: null });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    rule: GeofenceAlertRuleRow | null;
  }>({ open: false, rule: null });

  // -------------------------------------------------------------------------
  // URL helpers
  // -------------------------------------------------------------------------

  function buildUrl(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    return `${pathname}?${params.toString()}`;
  }

  // -------------------------------------------------------------------------
  // Search with debounce
  // -------------------------------------------------------------------------

  const [searchValue, setSearchValue] = useState(searchParams.get('search') ?? '');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      router.push(buildUrl({ search: value || undefined, page: '1' }));
    }, 300),
    [searchParams, pathname]
  );

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchValue(e.target.value);
    debouncedSearch(e.target.value);
  }

  // -------------------------------------------------------------------------
  // Sorting
  // -------------------------------------------------------------------------

  const currentSort = (searchParams.get('sort') as GeofenceAlertRuleSortField) ?? 'createdAt';
  const currentOrder = (searchParams.get('order') as SortDir) ?? 'asc';

  function handleSort(field: GeofenceAlertRuleSortField) {
    if (currentSort === field) {
      if (currentOrder === 'asc') {
        router.push(buildUrl({ sort: field, order: 'desc', page: '1' }));
      } else {
        router.push(buildUrl({ sort: undefined, order: undefined, page: '1' }));
      }
    } else {
      router.push(buildUrl({ sort: field, order: 'asc', page: '1' }));
    }
  }

  function SortIcon({ field }: { field: GeofenceAlertRuleSortField }) {
    if (currentSort !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    if (currentOrder === 'asc') return <ArrowUp className="ml-1 h-3 w-3" />;
    return <ArrowDown className="ml-1 h-3 w-3" />;
  }

  function SortableHeader({
    field,
    children,
  }: {
    field: GeofenceAlertRuleSortField;
    children: React.ReactNode;
  }) {
    return (
      <button
        className="flex items-center font-medium hover:text-foreground"
        onClick={() => handleSort(field)}
      >
        {children}
        <SortIcon field={field} />
      </button>
    );
  }

  // -------------------------------------------------------------------------
  // Pagination
  // -------------------------------------------------------------------------

  const { data, total, page, pageSize, totalPages } = initialData;

  function buildPageUrl(p: number) {
    return buildUrl({ page: String(p) });
  }

  // -------------------------------------------------------------------------
  // Mutation success handler
  // -------------------------------------------------------------------------

  function handleMutationSuccess() {
    router.refresh();
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search by geofence, alert type, condition..."
          value={searchValue}
          onChange={handleSearchChange}
          className="max-w-xs"
        />
        <Button onClick={() => setFormDialog({ open: true, rule: null })}>
          <Plus className="h-4 w-4 mr-2" />
          New Rule
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader field="geofenceName">Geocerca</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader field="alertTypeName">Tipo de alerta</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader field="conditionType">Condición</SortableHeader>
              </TableHead>
              <TableHead>Umbral</TableHead>
              <TableHead>Cooldown</TableHead>
              <TableHead>
                <SortableHeader field="active">Activo</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader field="priority">Prioridad</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader field="createdAt">Creado</SortableHeader>
              </TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  No se encontró información
                </TableCell>
              </TableRow>
            ) : (
              data.map((rule) => (
                <TableRow key={String(rule.id)}>
                  <TableCell className="font-medium">{rule.geofenceName}</TableCell>
                  <TableCell>{rule.alertTypeName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {rule.conditionType ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {rule.thresholdValue
                      ? `${rule.thresholdValue}${rule.thresholdUnit ? ' ' + rule.thresholdUnit : ''}`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {rule.cooldownPeriod != null ? `${rule.cooldownPeriod} min` : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={rule.active ? 'default' : 'secondary'}>
                      {rule.active ? 'Sí' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>{rule.priority ?? 1}</TableCell>
                  <TableCell>{formatDate(rule.createdAt)}</TableCell>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </span>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={page > 1 ? buildPageUrl(page - 1) : undefined}
                  aria-disabled={page <= 1}
                  className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 || p === totalPages || Math.abs(p - page) <= 1
                )
                .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                    acc.push('ellipsis');
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === 'ellipsis' ? (
                    <PaginationItem key={`ellipsis-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationLink
                        href={buildPageUrl(item)}
                        isActive={item === page}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

              <PaginationItem>
                <PaginationNext
                  href={page < totalPages ? buildPageUrl(page + 1) : undefined}
                  aria-disabled={page >= totalPages}
                  className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Dialogs */}
      <GeofenceAlertRuleFormDialog
        open={formDialog.open}
        rule={formDialog.rule}
        geofences={geofences}
        alertTypes={alertTypes}
        onClose={() => setFormDialog({ open: false, rule: null })}
        onSuccess={() => {
          setFormDialog({ open: false, rule: null });
          handleMutationSuccess();
        }}
      />

      <DeleteGeofenceAlertRuleDialog
        open={deleteDialog.open}
        rule={deleteDialog.rule}
        onClose={() => setDeleteDialog({ open: false, rule: null })}
        onSuccess={() => {
          setDeleteDialog({ open: false, rule: null });
          handleMutationSuccess();
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Debounce utility
// ---------------------------------------------------------------------------

function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
