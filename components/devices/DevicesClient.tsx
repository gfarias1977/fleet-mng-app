'use client';

import { useCallback, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Plus,
  Gauge,
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
import type { PaginatedResult, DeviceRow, DeviceSortField } from '@/data/devices';
import { DeviceFormDialog } from './DeviceFormDialog';
import { DeleteDeviceDialog } from './DeleteDeviceDialog';
import { SensorAssignmentDialog } from './SensorAssignmentDialog';

interface Props {
  initialData: PaginatedResult<DeviceRow>;
  deviceTypes: { id: number; name: string }[];
  assets: { id: number; number: string }[];
}

type SortDir = 'asc' | 'desc';

export function DevicesClient({ initialData, deviceTypes, assets }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [formDialog, setFormDialog] = useState<{
    open: boolean;
    device: DeviceRow | null;
  }>({ open: false, device: null });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    device: DeviceRow | null;
  }>({ open: false, device: null });

  const [sensorDialog, setSensorDialog] = useState<{
    open: boolean;
    deviceId: bigint | null;
    deviceName: string;
  }>({ open: false, deviceId: null, deviceName: '' });

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

  const currentSort = (searchParams.get('sort') as DeviceSortField) ?? 'name';
  const currentOrder = (searchParams.get('order') as SortDir) ?? 'asc';

  function handleSort(field: DeviceSortField) {
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

  function SortIcon({ field }: { field: DeviceSortField }) {
    if (currentSort !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    if (currentOrder === 'asc') return <ArrowUp className="ml-1 h-3 w-3" />;
    return <ArrowDown className="ml-1 h-3 w-3" />;
  }

  function SortableHeader({
    field,
    children,
  }: {
    field: DeviceSortField;
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
  // Status badge
  // -------------------------------------------------------------------------

  function statusBadge(status: string) {
    const variant =
      status === 'online' ? 'default' : status === 'offline' ? 'secondary' : 'outline';
    return <Badge variant={variant}>{status}</Badge>;
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Buscar dispositivos..."
          value={searchValue}
          onChange={handleSearchChange}
          className="max-w-xs"
        />
        <Button onClick={() => setFormDialog({ open: true, device: null })}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Dispositivo
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader field="serialNumber">Número de Serie</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader field="name">Nombre</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader field="deviceTypeName">Tipo</SortableHeader>
              </TableHead>
              <TableHead>Activo/Asset</TableHead>
              <TableHead>
                <SortableHeader field="brand">Marca</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader field="model">Modelo</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader field="status">Estado</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader field="active">Activo</SortableHeader>
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
              data.map((device) => (
                <TableRow key={String(device.id)}>
                  <TableCell className="font-medium">{device.serialNumber}</TableCell>
                  <TableCell>{device.name}</TableCell>
                  <TableCell>{device.deviceTypeName}</TableCell>
                  <TableCell>{device.assetNumber ?? '—'}</TableCell>
                  <TableCell>{device.brand ?? '—'}</TableCell>
                  <TableCell>{device.model ?? '—'}</TableCell>
                  <TableCell>{statusBadge(device.status)}</TableCell>
                  <TableCell>
                    <Badge variant={device.active ? 'default' : 'secondary'}>
                      {device.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => setFormDialog({ open: true, device })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Gestionar sensores"
                        onClick={() =>
                          setSensorDialog({
                            open: true,
                            deviceId: device.id,
                            deviceName: device.name,
                          })
                        }
                      >
                        <Gauge className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Eliminar"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteDialog({ open: true, device })}
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
      <DeviceFormDialog
        open={formDialog.open}
        device={formDialog.device}
        deviceTypes={deviceTypes}
        assets={assets}
        onClose={() => setFormDialog({ open: false, device: null })}
        onSuccess={() => {
          setFormDialog({ open: false, device: null });
          handleMutationSuccess();
        }}
      />

      <DeleteDeviceDialog
        open={deleteDialog.open}
        device={deleteDialog.device}
        onClose={() => setDeleteDialog({ open: false, device: null })}
        onSuccess={() => {
          setDeleteDialog({ open: false, device: null });
          handleMutationSuccess();
        }}
      />

      <SensorAssignmentDialog
        open={sensorDialog.open}
        deviceId={sensorDialog.deviceId}
        deviceName={sensorDialog.deviceName}
        onClose={() => setSensorDialog({ open: false, deviceId: null, deviceName: '' })}
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
