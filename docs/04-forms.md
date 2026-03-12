# 04 — Forms & Dialogs: AddEdit Pattern

Dialog pattern used across all CRUD modules.

---

## Stack

| Target |
|---|
| React Hook Form + Zod |
| shadcn `Dialog` + `Input` + `Combobox` |
| `form.formState.errors` |

---

## Install

```bash
npm install react-hook-form zod @hookform/resolvers
```

---

## Form Schema Pattern (Zod)

Define the validation schema separately from the component.

```ts
// src/components/cartas/carta.schema.ts
import { z } from 'zod';

export const cartaSchema = z.object({
  ordenCompraId: z.string().min(1, 'Debe seleccionar una orden de compra'),
  categoryManagerId: z.string().min(1, 'Debe seleccionar un Category Manager'),
  tipoCategory: z.string().min(1, 'Debe seleccionar el tipo de categoría'),
  politicaDevolucion: z.string().min(1, 'Debe ingresar la política de devolución'),
  condicionesCanje: z.string().min(1, 'Debe ingresar las condiciones de canje'),
  comentario: z.string().min(1, 'Debe ingresar un comentario'),
  productos: z
    .array(
      z.object({
        productoId: z.string(),
        lote: z.string().min(1, 'El lote es requerido'),
        cantidadUnitaria: z.number().positive('Cantidad debe ser mayor a 0'),
        descuento: z.number().min(0).max(100),
        fechaVencimiento: z.string().min(1, 'La fecha de vencimiento es requerida'),
        plazoPagoAdicional: z.number().min(0),
        canje: z.boolean(),
      }),
    )
    .min(1, 'Debe seleccionar al menos un producto'),
  fileCCV: z
    .instanceof(File, { message: 'Debe adjuntar el archivo PDF' })
    .refine((f) => f.type === 'application/pdf', 'Solo se aceptan archivos PDF')
    .nullable(),
});

export type CartaFormValues = z.infer<typeof cartaSchema>;
```

---

## AddEditGeofence Dialog

```tsx
// src/components/cartas/AddEditCarta.tsx
'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';  // see Combobox section below
import { FileDropzone } from '@/components/crud/FileDropzone';
import { cartaSchema, type CartaFormValues } from './carta.schema';
import type { Carta } from '@/types/carta';

interface AddEditCartaProps {
  open: boolean;
  carta?: Carta | null;       // null = create, populated = edit
  onClose: () => void;
  onSaved: () => void;
}

export function AddEditCarta({ open, carta, onClose, onSaved }: AddEditCartaProps) {
  const form = useForm<CartaFormValues>({
    resolver: zodResolver(cartaSchema),
    defaultValues: {
      ordenCompraId: '',
      categoryManagerId: '',
      tipoCategory: '',
      politicaDevolucion: '',
      condicionesCanje: '',
      comentario: '',
      productos: [],
      fileCCV: null,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (carta) {
      form.reset({
        ordenCompraId: carta.ordenCompraId,
        categoryManagerId: carta.categoryManagerId,
        tipoCategory: carta.tipoCategory,
        politicaDevolucion: carta.politicaDevolucion,
        condicionesCanje: carta.condicionesCanje,
        comentario: carta.comentario,
        productos: carta.productos,
        fileCCV: null,
      });
    } else {
      form.reset();
    }
  }, [carta, form]);

  const onSubmit = async (values: CartaFormValues) => {
    // dispatch create or update action
    // await saveCarta(values);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{carta ? 'Edit Geofence' : 'New Geofence'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Section 1: Orden de Compra */}
            <section>
              <h3 className="text-h3 mb-3">Orden de Compra</h3>
              <FormField
                control={form.control}
                name="ordenCompraId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orden de Compra</FormLabel>
                    <FormControl>
                      <Combobox
                        placeholder="Seleccionar orden..."
                        value={field.value}
                        onValueChange={field.onChange}
                        // options loaded from store / API
                        options={[]}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            {/* Section 2: Category Manager */}
            <section>
              <h3 className="text-h3 mb-3">Category Manager</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="categoryManagerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Manager</FormLabel>
                      <FormControl>
                        <Combobox
                          placeholder="Seleccionar..."
                          value={field.value}
                          onValueChange={field.onChange}
                          options={[]}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tipoCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo Categoría</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Tipo..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {/* Section 3: Otros Datos */}
            <section>
              <h3 className="text-h3 mb-3">Otros Datos</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="politicaDevolucion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Política de Devolución</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="condicionesCanje"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condiciones de Canje</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fileCCV"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Archivo CCV (PDF)</FormLabel>
                      <FormControl>
                        <FileDropzone
                          accept={{ 'application/pdf': ['.pdf'] }}
                          onFileSelected={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Combobox (Autocomplete replacement)

shadcn doesn't ship a Combobox by default but provides a recipe using `Command` + `Popover`.

```tsx
// src/components/ui/combobox.tsx
'use client';
import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface Option { label: string; value: string }

interface ComboboxProps {
  options: Option[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}

export function Combobox({
  options, value, onValueChange, placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...', emptyMessage = 'Sin resultados', disabled,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn('w-full justify-between font-normal', !selected && 'text-muted-foreground')}
        >
          {selected?.label ?? placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {options.map((opt) => (
              <CommandItem
                key={opt.value}
                value={opt.value}
                onSelect={() => { onValueChange(opt.value); setOpen(false); }}
              >
                <Check className={cn('mr-2 h-4 w-4', value === opt.value ? 'opacity-100' : 'opacity-0')} />
                {opt.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

---

## FileDropzone Component

Replaces `react-dropzone` integration inside the current dialog.

```tsx
// src/components/crud/FileDropzone.tsx
'use client';
import { useCallback } from 'react';
import { useDropzone, Accept } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

// npm install react-dropzone
interface FileDropzoneProps {
  accept?: Accept;
  onFileSelected: (file: File | null) => void;
  value?: File | null;
}

export function FileDropzone({ accept, onFileSelected, value }: FileDropzoneProps) {
  const onDrop = useCallback((files: File[]) => {
    onFileSelected(files[0] ?? null);
  }, [onFileSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept, maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
        isDragActive ? 'border-primary bg-accent' : 'border-border hover:border-primary/50',
      )}
    >
      <input {...getInputProps()} />
      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
      {value ? (
        <p className="text-sm text-foreground">{value.name}</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {isDragActive ? 'Suelta el archivo aquí' : 'Arrastra un PDF o haz clic para seleccionar'}
        </p>
      )}
    </div>
  );
}
```
