# Forms Coding Standards

## Overview

All forms use **react-hook-form** with **zodResolver** and **shadcn/ui Form components**. No other form pattern is permitted.

---

## Required installation

Before creating any form, install the required packages if not already present:

```bash
npm install react-hook-form @hookform/resolvers zod
npx shadcn add form input label textarea select checkbox
```

---

## Mandatory pattern

Every form must follow this stack:

1. **Zod schema** — defines and validates form shape
2. **`useForm` + `zodResolver`** — connects schema to react-hook-form
3. **shadcn `Form` components** — provides accessible, styled field wrappers
4. **Server Action** — receives validated values; returns `{ success, error }`

Never use uncontrolled `<form>` elements, raw `FormData`, or `useState` for field values.

---

## Schema placement

- Define the Zod schema in the same file as the form component.
- If the schema is reused across multiple files, extract it to a colocated `schemas.ts`.

```ts
// ✅ Same file — fine for single-use schemas
const createDeviceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  uuid: z.string().uuid('Must be a valid UUID'),
});

type CreateDeviceValues = z.infer<typeof createDeviceSchema>;
```

---

## Full example

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createDeviceAction } from './actions';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  uuid: z.string().uuid('Must be a valid UUID'),
});

type FormValues = z.infer<typeof schema>;

export function CreateDeviceForm() {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', uuid: '' },
  });

  async function onSubmit(values: FormValues) {
    const result = await createDeviceAction(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Device created.');
    router.push('/devices');
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="My device" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="uuid"
          render={({ field }) => (
            <FormItem>
              <FormLabel>UUID</FormLabel>
              <FormControl>
                <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Creating…' : 'Create device'}
        </Button>
      </form>
    </Form>
  );
}
```

---

## Connecting to Server Actions

Call the Server Action inside `form.handleSubmit`. The action returns `{ success: true, data }` or `{ success: false, error }` — handle both cases (see `docs/09-error-handling.md` for toast usage).

```ts
async function onSubmit(values: CreateDeviceValues) {
  const result = await createDeviceAction(values);
  if (!result.success) {
    toast.error(result.error);
    return;
  }
  toast.success('Device created.');
  router.push('/devices');
}
```

Never pass `FormData` to a Server Action. Pass the typed values object directly (aligns with `docs/14 - data-mutations.md`).

---

## Combobox (Autocomplete replacement)

shadcn doesn't ship a Combobox by default but provides a recipe using `Command` + `Popover`.

```tsx
// components/ui/combobox.tsx
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
  options, value, onValueChange, placeholder = 'Select...',
  searchPlaceholder = 'Search...', emptyMessage = 'No results', disabled,
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

## Checklist

Before writing any form, verify:

- [ ] `react-hook-form`, `@hookform/resolvers`, `zod`, and `sonner` are installed
- [ ] shadcn form components are scaffolded (`npx shadcn add form input label ...`)
- [ ] A Zod schema defines all field types and validation messages
- [ ] `useForm` is initialized with `zodResolver(schema)`
- [ ] `form.handleSubmit(onSubmit)` is used — not a native submit handler
- [ ] The Server Action receives a typed values object — never `FormData`
- [ ] Errors from `result.error` are shown via `toast.error()`
- [ ] `FormMessage` is rendered inside each `FormItem` to display field-level errors
