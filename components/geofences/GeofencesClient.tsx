'use client';

import { useCallback, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  MapPin,
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
import type { PaginatedResult, GeofenceRow, GeofenceSortField } from '@/data/geofences';
import { GeofenceFormDialog } from './GeofenceFormDialog';
import { DeleteGeofenceDialog } from './DeleteGeofenceDialog';
import { GeofenceMapDialog } from './GeofenceMapDialog';

interface Props {
  initialData: PaginatedResult<GeofenceRow>;
  geofenceTypes: { id: number; name: string }[];
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return '—';
  return format(new Date(date), 'do MMM yyyy');
}

type SortDir = 'asc' | 'desc';

export function GeofencesClient({ initialData, geofenceTypes }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [formDialog, setFormDialog] = useState<{
    open: boolean;
    geofence: GeofenceRow | null;
  }>({ open: false, geofence: null });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    geofence: GeofenceRow | null;
  }>({ open: false, geofence: null });

  const [mapDialog, setMapDialog] = useState<{
    open: boolean;
    geofenceId: string | null;
    geofenceName: string;
  }>({ open: false, geofenceId: null, geofenceName: '' });

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

  const currentSort = (searchParams.get('sort') as GeofenceSortField) ?? 'name';
  const currentOrder = (searchParams.get('order') as SortDir) ?? 'asc';

  function handleSort(field: GeofenceSortField) {
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

  function SortIcon({ field }: { field: GeofenceSortField }) {
    if (currentSort !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    if (currentOrder === 'asc') return <ArrowUp className="ml-1 h-3 w-3" />;
    return <ArrowDown className="ml-1 h-3 w-3" />;
  }

  function SortableHeader({
    field,
    children,
  }: {
    field: GeofenceSortField;
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
          placeholder="Search geofences..."
          value={searchValue}
          onChange={handleSearchChange}
          className="max-w-xs"
        />
        <Button onClick={() => setFormDialog({ open: true, geofence: null })}>
          <Plus className="h-4 w-4 mr-2" />
          New Geofence
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader field="name">Name</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader field="typeName">Type</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader field="description">Description</SortableHeader>
              </TableHead>
              <TableHead>Geometry</TableHead>
              <TableHead>
                <SortableHeader field="active">Active</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader field="createdAt">Created</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader field="updatedAt">Updated</SortableHeader>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  No geofences found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((geo) => (
                <TableRow key={String(geo.id)}>
                  <TableCell className="font-medium">{geo.name}</TableCell>
                  <TableCell>{geo.typeName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {geo.description
                      ? geo.description.length > 40
                        ? geo.description.slice(0, 40) + '…'
                        : geo.description
                      : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{geo.geometrySummary || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={geo.active ? 'default' : 'secondary'}>
                      {geo.active ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(geo.createdAt)}</TableCell>
                  <TableCell>{formatDate(geo.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Edit"
                        onClick={() => setFormDialog({ open: true, geofence: geo })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="View Map"
                        onClick={() =>
                          setMapDialog({
                            open: true,
                            geofenceId: String(geo.id),
                            geofenceName: geo.name,
                          })
                        }
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteDialog({ open: true, geofence: geo })}
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
      <GeofenceFormDialog
        open={formDialog.open}
        geofence={formDialog.geofence}
        geofenceTypes={geofenceTypes}
        onClose={() => setFormDialog({ open: false, geofence: null })}
        onSuccess={() => {
          setFormDialog({ open: false, geofence: null });
          handleMutationSuccess();
        }}
      />

      <DeleteGeofenceDialog
        open={deleteDialog.open}
        geofence={deleteDialog.geofence}
        onClose={() => setDeleteDialog({ open: false, geofence: null })}
        onSuccess={() => {
          setDeleteDialog({ open: false, geofence: null });
          handleMutationSuccess();
        }}
      />

      <GeofenceMapDialog
        open={mapDialog.open}
        geofenceId={mapDialog.geofenceId}
        geofenceName={mapDialog.geofenceName}
        onClose={() => setMapDialog({ open: false, geofenceId: null, geofenceName: '' })}
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
