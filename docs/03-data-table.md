# 03 — DataTable: Reusable Table System

Replaces the per-entity `TableHead` + `TableToolbar` + `ListRow` pattern used across all modules (Cartas, Users, Roles, Proveedores, etc.).

---

## Problem with the current pattern

Each entity has its own `CartaTableHead`, `CartaTableToolbar`, `CartaListRow` — these are ~90% identical. The new system uses a **single generic `DataTable`** driven by column definitions.

---

## Generic DataTable Component

```tsx
// src/components/data-table/DataTable.tsx
'use client';
import { useState } from 'react';
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { DataTablePagination } from './DataTablePagination';
import { DataTableToolbar } from './DataTableToolbar';
import type { DataTableToolbarProps } from './DataTableToolbar';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  toolbar?: DataTableToolbarProps;
  maxHeight?: string;
  isLoading?: boolean;
  noDataMessage?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  toolbar,
  maxHeight = '415px',
  isLoading,
  noDataMessage = 'No se encontraron registros.',
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="w-full bg-card rounded shadow-card">
      {toolbar && <DataTableToolbar {...toolbar} />}

      <div style={{ maxHeight, overflowY: 'auto' }}>
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer select-none whitespace-nowrap"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center text-muted-foreground">
                  {noDataMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-accent/30">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />
    </div>
  );
}
```

> **Dependency:** Install `@tanstack/react-table`:
> ```bash
> npm install @tanstack/react-table
> ```

---

## DataTableToolbar

Replaces `CartaTableToolbar`, `UserTableToolbar`, etc.

```tsx
// src/components/data-table/DataTableToolbar.tsx
'use client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';

export interface DataTableToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onAdd?: () => void;
  addLabel?: string;
  extraActions?: React.ReactNode;
}

export function DataTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  onAdd,
  addLabel = 'Agregar',
  extraActions,
}: DataTableToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border/10">
      <div className="flex items-center gap-2">
        {onSearchChange && (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
        )}
        {extraActions}
      </div>

      {onAdd && (
        <Button size="sm" onClick={onAdd}>
          <Plus className="mr-1 h-4 w-4" />
          {addLabel}
        </Button>
      )}
    </div>
  );
}
```

---

## DataTablePagination

Replaces MUI `TablePagination`.

```tsx
// src/components/data-table/DataTablePagination.tsx
import { Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function DataTablePagination<T>({ table }: { table: Table<T> }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border/10">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filas por página:</span>
        <Select
          value={String(table.getState().pagination.pageSize)}
          onValueChange={(v) => table.setPageSize(Number(v))}
        >
          <SelectTrigger className="h-8 w-16">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 50].map((size) => (
              <SelectItem key={size} value={String(size)}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline" size="icon" className="h-8 w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline" size="icon" className="h-8 w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

## Row Actions Cell

Standard edit/view/delete actions rendered as a column. Each entity passes this as the last column definition.

```tsx
// src/components/data-table/RowActions.tsx
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';

interface RowActionsProps<T> {
  row: T;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
}

export function RowActions<T>({ row, onView, onEdit, onDelete }: RowActionsProps<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onView && (
          <DropdownMenuItem onClick={() => onView(row)}>
            <Eye className="mr-2 h-4 w-4" /> Ver
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onClick={() => onEdit(row)}>
            <Pencil className="mr-2 h-4 w-4" /> Editar
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem onClick={() => onDelete(row)} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## Usage Example: Cartas Table

```tsx
// src/components/cartas/CartasColumns.tsx
import { ColumnDef } from '@tanstack/react-table';
import { RowActions } from '@/components/data-table/RowActions';
import type { Carta } from '@/types/carta';

export function buildCartaColumns(
  onView: (c: Carta) => void,
  onEdit: (c: Carta) => void,
  onDelete: (c: Carta) => void,
): ColumnDef<Carta>[] {
  return [
    { accessorKey: 'ccvId', header: 'ID' },
    { accessorKey: 'proveedorNombre', header: 'Proveedor' },
    { accessorKey: 'categoryManager', header: 'Category Manager' },
    { accessorKey: 'estado', header: 'Estado' },
    { accessorKey: 'fechaCreacion', header: 'Fecha Creación' },
    {
      id: 'actions',
      cell: ({ row }) => (
        <RowActions row={row.original} onView={onView} onEdit={onEdit} onDelete={onDelete} />
      ),
    },
  ];
}
```

```tsx
// src/components/cartas/CartasModule.tsx
'use client';
import { useEffect, useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { buildCartaColumns } from './CartasColumns';
import { useCartas } from '@/hooks/useCartas';
import { useDebounce } from '@/hooks/useDebounce';
import type { Carta } from '@/types/carta';

export function CartasModule() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const { cartas, isLoading, refetch } = useCartas(debouncedSearch);

  const [selected, setSelected] = useState<Carta | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const columns = buildCartaColumns(
    (c) => { setSelected(c); /* open detail */ },
    (c) => { setSelected(c); setDialogOpen(true); },
    (c) => { setSelected(c); setConfirmOpen(true); },
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={cartas}
        isLoading={isLoading}
        toolbar={{
          searchValue: search,
          onSearchChange: setSearch,
          searchPlaceholder: 'Buscar carta...',
          onAdd: () => { setSelected(null); setDialogOpen(true); },
          addLabel: 'Nueva Carta',
        }}
      />
      {/* AddEditCarta dialog, ConfirmDialog go here */}
    </>
  );
}
```
