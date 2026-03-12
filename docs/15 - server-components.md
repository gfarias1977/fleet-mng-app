# Server Components Coding Standards

## Params and searchParams must be awaited

This project uses **Next.js 16**, where `params` and `searchParams` are **Promises**. They must always be awaited before accessing any property. Failing to do so will cause a runtime error.

```tsx
// ✅ Correct — params awaited
export default async function DevicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  ...
}

// ✅ Correct — searchParams awaited
export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const { page, search } = await searchParams;
  ...
}

// ✅ Correct — both awaited
export default async function DevicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  ...
}

// ❌ Wrong — params accessed without awaiting
export default async function DevicePage({ params }) {
  const id = params.id; // runtime error in Next.js 16
}

// ❌ Wrong — destructured directly in the function signature
export default async function DevicePage({ params: { id } }) {
  // runtime error in Next.js 16
}
```

## Type the props explicitly

Always declare the full prop type with `Promise<...>` for both `params` and `searchParams`. Do not use `any` or leave them untyped.

```tsx
// ✅ Correct
type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function Page({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab } = await searchParams;
  ...
}

// ❌ Wrong — untyped
export default async function Page({ params, searchParams }: any) { ... }
```

## All Server Components must be async

Server Components that fetch data or access params must be declared with `async`. There is no synchronous alternative for awaiting params.

```tsx
// ✅ Correct
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  ...
}

// ❌ Wrong — non-async, cannot await params
export default function Page({ params }) { ... }
```

## Summary checklist

Before writing any Server Component that uses routing context, verify:

- [ ] `params` is typed as `Promise<{ ... }>`
- [ ] `searchParams` is typed as `Promise<{ ... }>`
- [ ] Both are awaited at the top of the component body before any property access
- [ ] The component is declared `async`
- [ ] No destructuring of `params` or `searchParams` in the function signature
