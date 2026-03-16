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
import type { PaginatedResult, DeviceType, DeviceTypeSortField } from '@/data/device-types';
import { DeviceTypeFormDialog } from './DeviceTypeFormDialog';
import { DeleteDeviceTypeDialog } from './DeleteDeviceTypeDialog';

interface Props {
  initialData: PaginatedResult<DeviceType>;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return '—';
  return format(new Date(date), 'do MMM yyyy, HH:mm');
}

type SortDir = 'asc' | 'desc';

export function DeviceTypesClient({ initialData }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [formDialog, setFormDialog] = useState<{
    open: boolean;
    deviceType: DeviceType | null;
  }>({ open: false, deviceType: null });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    deviceType: DeviceType | null;
  }>({ open: false, deviceType: null });

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

  const currentSort = (searchParams.get('sort') as DeviceTypeSortField) ?? 'name';
  const currentOrder = (searchParams.get('order') as SortDir) ?? 'asc';

  function handleSort(field: DeviceTypeSortField) {
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

  function SortIcon({ field }: { field: DeviceTypeSortField }) {
    if (currentSort !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    if (currentOrder === 'asc') return <ArrowUp className="ml-1 h-3 w-3" />;
    return <ArrowDown className="ml-1 h-3 w-3" />;
  }

  function SortableHeader({
    field,
    children,
  }: {
    field: DeviceTypeSortField;
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
  // Capabilities render
  // -------------------------------------------------------------------------

  function CapabilitiesBadges({ caps }: { caps: string[] | null }) {
    if (!caps || caps.length === 0) return <span className="text-muted-foreground">—</span>;
    const visible = caps.slice(0, 3);
    const remaining = caps.length - visible.length;
    return (
      <div className="flex flex-wrap gap-1">
        {visible.map((c) => (
          <Badge key={c} variant="outline" className="text-xs">
            {c}
          </Badge>
        ))}
        {remaining > 0 && (
          <Badge variant="secondary" className="text-xs">
            +{remaining} más
          </Badge>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Buscar tipos de dispositivo..."
          value={searchValue}
          onChange={handleSearchChange}
          className="max-w-xs"
        />
        <Button onClick={() => setFormDialog({ open: true, deviceType: null })}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Tipo de Dispositivo
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader field="name">Nombre</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader field="description">Descripción</SortableHeader>
              </TableHead>
              <TableHead>Capacidades</TableHead>
              <TableHead>
                <SortableHeader field="isActive">Activo</SortableHeader>
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
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No se encontró información
                </TableCell>
              </TableRow>
            ) : (
              data.map((dt) => (
                <TableRow key={dt.id}>
                  <TableCell className="font-medium">{dt.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {dt.description
                      ? dt.description.length > 60
                        ? dt.description.slice(0, 60) + '…'
                        : dt.description
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <CapabilitiesBadges caps={dt.capabilities} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={dt.isActive ? 'default' : 'secondary'}>
                      {dt.isActive ? 'Sí' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(dt.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => setFormDialog({ open: true, deviceType: dt })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Eliminar"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteDialog({ open: true, deviceType: dt })}
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
      <DeviceTypeFormDialog
        open={formDialog.open}
        deviceType={formDialog.deviceType}
        onClose={() => setFormDialog({ open: false, deviceType: null })}
        onSuccess={() => {
          setFormDialog({ open: false, deviceType: null });
          handleMutationSuccess();
        }}
      />

      <DeleteDeviceTypeDialog
        open={deleteDialog.open}
        deviceType={deleteDialog.deviceType}
        onClose={() => setDeleteDialog({ open: false, deviceType: null })}
        onSuccess={() => {
          setDeleteDialog({ open: false, deviceType: null });
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
