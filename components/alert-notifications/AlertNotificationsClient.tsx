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
  PaginatedAlertNotificationsResult,
  AlertNotificationRow,
  AlertNotificationSortField,
  AlertForSelectOption,
} from '@/data/alert-notifications';
import { AlertNotificationFormDialog } from './AlertNotificationFormDialog';
import { DeleteAlertNotificationDialog } from './DeleteAlertNotificationDialog';

interface Props {
  initialData: PaginatedAlertNotificationsResult;
  alertsForSelect: AlertForSelectOption[];
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return '—';
  return format(new Date(date), 'do MMM yyyy, HH:mm');
}

function statusVariant(
  status: string | null
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'delivered':
      return 'default';
    case 'sent':
      return 'outline';
    case 'pending':
      return 'secondary';
    case 'failed':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function statusLabel(status: string | null): string {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'sent':
      return 'Enviada';
    case 'delivered':
      return 'Entregada';
    case 'failed':
      return 'Fallida';
    default:
      return status ?? '—';
  }
}

function methodLabel(method: string | null): string {
  switch (method) {
    case 'email':
      return 'Email';
    case 'sms':
      return 'SMS';
    case 'push':
      return 'Push';
    case 'webhook':
      return 'Webhook';
    default:
      return method ?? '—';
  }
}

type SortDir = 'asc' | 'desc';

export function AlertNotificationsClient({ initialData, alertsForSelect }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [formDialog, setFormDialog] = useState<{
    open: boolean;
    notification: AlertNotificationRow | null;
  }>({ open: false, notification: null });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    notification: AlertNotificationRow | null;
  }>({ open: false, notification: null });

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

  const currentSort =
    (searchParams.get('sort') as AlertNotificationSortField) ?? 'createdAt';
  const currentOrder = (searchParams.get('order') as SortDir) ?? 'desc';

  function handleSort(field: AlertNotificationSortField) {
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

  function SortIcon({ field }: { field: AlertNotificationSortField }) {
    if (currentSort !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    if (currentOrder === 'asc') return <ArrowUp className="ml-1 h-3 w-3" />;
    return <ArrowDown className="ml-1 h-3 w-3" />;
  }

  function SortableHeader({
    field,
    children,
  }: {
    field: AlertNotificationSortField;
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
          placeholder="Buscar notificaciones..."
          value={searchValue}
          onChange={handleSearchChange}
          className="max-w-xs"
        />
        <Button onClick={() => setFormDialog({ open: true, notification: null })}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Notificación
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader field="alertTypeName">Tipo de Alerta</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader field="notificationMethod">Método</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader field="destination">Destino</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader field="subject">Asunto</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader field="status">Estado</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader field="sentAt">Enviada</SortableHeader>
              </TableHead>
              <TableHead>Entregada</TableHead>
              <TableHead>
                <SortableHeader field="retryCount">Reintentos</SortableHeader>
              </TableHead>
              <TableHead>Error</TableHead>
              <TableHead>
                <SortableHeader field="createdAt">Creado</SortableHeader>
              </TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="text-center py-10 text-muted-foreground"
                >
                  No se encontró información
                </TableCell>
              </TableRow>
            ) : (
              data.map((n) => (
                <TableRow key={String(n.id)}>
                  <TableCell className="text-sm">
                    {n.alertTypeName ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{methodLabel(n.notificationMethod)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                    {n.destination ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm max-w-[160px] truncate">
                    {n.subject ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(n.status)}>
                      {statusLabel(n.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                    {formatDate(n.sentAt)}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                    {formatDate(n.deliveredAt)}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    <span className="font-mono">
                      {n.retryCount ?? 0}/{n.maxRetries ?? 3}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-destructive max-w-[160px] truncate">
                    {n.errorMessage
                      ? n.errorMessage.length > 50
                        ? n.errorMessage.slice(0, 50) + '…'
                        : n.errorMessage
                      : '—'}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                    {formatDate(n.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => setFormDialog({ open: true, notification: n })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Eliminar"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteDialog({ open: true, notification: n })}
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
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}
          </span>
          <Pagination>
            <PaginationContent>
              {/* Primera */}
              <PaginationItem>
                <PaginationPrevious
                  href={page > 1 ? buildPageUrl(1) : undefined}
                  aria-disabled={page <= 1}
                  className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                  aria-label="Primera página"
                />
              </PaginationItem>
              {/* Anterior */}
              <PaginationItem>
                <PaginationPrevious
                  href={page > 1 ? buildPageUrl(page - 1) : undefined}
                  aria-disabled={page <= 1}
                  className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
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
                      <PaginationLink href={buildPageUrl(item)} isActive={item === page}>
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

              {/* Siguiente */}
              <PaginationItem>
                <PaginationNext
                  href={page < totalPages ? buildPageUrl(page + 1) : undefined}
                  aria-disabled={page >= totalPages}
                  className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
              {/* Última */}
              <PaginationItem>
                <PaginationNext
                  href={page < totalPages ? buildPageUrl(totalPages) : undefined}
                  aria-disabled={page >= totalPages}
                  className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                  aria-label="Última página"
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Dialogs */}
      <AlertNotificationFormDialog
        open={formDialog.open}
        notification={formDialog.notification}
        alertsForSelect={alertsForSelect}
        onClose={() => setFormDialog({ open: false, notification: null })}
        onSuccess={() => {
          setFormDialog({ open: false, notification: null });
          handleMutationSuccess();
        }}
      />

      <DeleteAlertNotificationDialog
        open={deleteDialog.open}
        notification={deleteDialog.notification}
        onClose={() => setDeleteDialog({ open: false, notification: null })}
        onSuccess={() => {
          setDeleteDialog({ open: false, notification: null });
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
