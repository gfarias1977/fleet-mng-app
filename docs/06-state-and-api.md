# 06 — State Management & API Layer

Replaces Redux + redux-thunk with a lighter solution appropriate for Next.js 14 App Router.

---

## Recommended Approach

| Concern | Current | Target |
|---|---|---|
| Server data (lists, details) | Redux reducers + thunk | TanStack Query (React Query) |
| UI state (dialogs, selections) | Redux slices | Zustand store or `useState` |
| Auth state | Redux `auth` reducer | Zustand `useAuthStore` + Next.js middleware |
| Routing state | `connected-react-router` | Next.js App Router (drop entirely) |

> If the team prefers to keep Redux, use **Redux Toolkit** instead of the current plain Redux setup.

---

## Install

```bash
npm install @tanstack/react-query zustand
npm install @tanstack/react-query-devtools -D
```

---

## Axios Instance

Direct port of `src/services/config/index.js`.

```ts
// src/lib/axios.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'api-key': process.env.NEXT_PUBLIC_API_KEY ?? '',
    'Content-Type': 'application/json',
  },
});

// Inject auth token on every request
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('ccv_token')
    : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global error handling (replaces dispatch(fetchError(...)))
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const message = error.response?.data?.message ?? 'Error de conexión';
    // fire toast instead of redux action
    import('@/lib/toast').then(({ toast }) => toast.error(message));
    return Promise.reject(error);
  },
);
```

---

## TanStack Query Setup

```tsx
// src/app/providers.tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000, retry: 1 },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {children}
        <Toaster richColors />
      </ThemeProvider>
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}
```

```tsx
// src/app/layout.tsx
import { Providers } from './providers';
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## Data Hooks Pattern

Each module gets a hooks file that wraps TanStack Query. This replaces the Redux action + selector pattern.

```ts
// src/hooks/useCartas.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { Carta } from '@/types/carta';

const QUERY_KEY = 'cartas';

// Fetch
export function useCartas(search = '') {
  return useQuery({
    queryKey: [QUERY_KEY, search],
    queryFn: async () => {
      const { data } = await api.get<Carta[]>('/cartas', { params: { search } });
      return data;
    },
  });
}

// Create
export function useCreateCarta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Carta>) => api.post('/cartas', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

// Update
export function useUpdateCarta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<Carta> & { id: string }) =>
      api.put(`/cartas/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

// Delete
export function useDeleteCarta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/cartas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
```

---

## Auth Store (Zustand)

Replaces `src/redux/reducers/Auth.js`.

```ts
// src/store/auth.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/axios';

interface AuthUser {
  userId: string;
  email: string;
  empresaCodigo: string;
  rutEmpresa: string;
  roles: string[];
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        set({ user: data.user, token: data.token });
        localStorage.setItem('ccv_token', data.token);
      },
      logout: () => {
        set({ user: null, token: null });
        localStorage.removeItem('ccv_token');
      },
    }),
    { name: 'ccv-auth' },
  ),
);
```

---

## Common UI State (Zustand)

Replaces `src/redux/reducers/Common.js` (loading, error messages).

```ts
// src/store/ui.store.ts
import { create } from 'zustand';

interface UIState {
  loading: boolean;
  setLoading: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  loading: false,
  setLoading: (v) => set({ loading: v }),
}));
```

> Errors/toasts: handled globally in the Axios interceptor via `sonner` toast (see `axios.ts` above). No need for a Redux `fetchError` action.

---

## Redux Toolkit (alternative if keeping Redux)

If the team prefers to keep Redux, migrate to RTK:

```bash
npm install @reduxjs/toolkit react-redux
```

```ts
// src/store/cartas.slice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/axios';
import type { Carta } from '@/types/carta';

export const fetchCartas = createAsyncThunk('cartas/fetch', async (search: string) => {
  const { data } = await api.get<Carta[]>('/cartas', { params: { search } });
  return data;
});

const cartasSlice = createSlice({
  name: 'cartas',
  initialState: { items: [] as Carta[], loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCartas.pending, (state) => { state.loading = true; })
      .addCase(fetchCartas.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchCartas.rejected, (state) => { state.loading = false; });
  },
});

export default cartasSlice.reducer;
```
