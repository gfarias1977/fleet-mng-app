# 01 — Theme: Colors, Typography, Dark Mode


## CSS Variables (`globals.css`)

shadcn/ui uses CSS custom properties on `:root` (light) and `.dark` (dark mode).
Map the three MUI theme variants (light, semiDark, dark) as follows:

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* ── Light theme (matches MUI lightTheme + defaultTheme) ── */
  :root {
    --background: 244 244 247;          /* #f4f4f7 */
    --foreground: 0 0 0;                /* rgba(0,0,0,0.87) */

    --card: 255 255 255;
    --card-foreground: 0 0 0;

    --popover: 255 255 255;
    --popover-foreground: 0 0 0;

    /* Primary = MUI indigo */
    --primary: 63 81 181;               /* indigo[500] #3f51b5 */
    --primary-foreground: 255 255 255;

    /* Secondary = MUI pink */
    --secondary: 233 30 99;             /* pink[500] #e91e63 */
    --secondary-foreground: 255 255 255;

    --muted: 245 245 245;
    --muted-foreground: 0 0 0;          /* rgba(0,0,0,0.38) */

    --accent: 239 229 253;              /* navActiveBgColor */
    --accent-foreground: 98 0 238;      /* textActiveColor #6200EE */

    --destructive: 244 67 54;           /* MUI error red */
    --destructive-foreground: 255 255 255;

    --border: 0 0 0;                    /* rgba(0,0,0,0.06) → use opacity */
    --input: 0 0 0;
    --ring: 63 81 181;

    --radius: 0.25rem;                  /* MUI Card borderRadius: 4 */

    /* Sidebar tokens */
    --sidebar-bg: 255 255 255;
    --sidebar-text: 0 0 0;              /* rgba(0,0,0,0.6) */
    --sidebar-text-active: 98 0 238;    /* #6200EE */
    --sidebar-hover: 229 229 229;
    --sidebar-active-bg: 239 229 253;
  }

  /* ── Dark theme (matches MUI darkTheme) ── */
  .dark {
    --background: 46 46 46;            /* #2e2e2e */
    --foreground: 255 255 255;         /* rgba(255,255,255,0.87) */

    --card: 18 18 18;                  /* #121212 */
    --card-foreground: 255 255 255;

    --popover: 54 54 54;               /* #363636 */
    --popover-foreground: 255 255 255;

    --primary: 63 81 181;
    --primary-foreground: 255 255 255;

    --muted: 83 81 81;                 /* #535151 */
    --muted-foreground: 255 255 255;   /* rgba(255,255,255,0.38) */

    --accent: 0 0 0;                   /* menuActiveBgColor rgba(0,0,0,0.5) */
    --accent-foreground: 255 255 255;

    --border: 255 255 255;             /* rgba(255,255,255,0.06) */
    --sidebar-bg: 54 54 54;            /* #363636 */
    --sidebar-active-bg: 63 81 181;
  }

  /* ── Semi-dark (sidebar dark, content light) ── */
  .semi-dark {
    --sidebar-bg: 54 54 54;
    --sidebar-text: 255 255 255;       /* rgba(255,255,255,0.3) */
    --sidebar-text-active: 255 255 255;
    --sidebar-active-bg: 63 81 181;
  }
}
```

---

## Tailwind Config

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        sidebar: {
          bg: 'hsl(var(--sidebar-bg) / <alpha-value>)',
          text: 'hsl(var(--sidebar-text) / <alpha-value>)',
          'text-active': 'hsl(var(--sidebar-text-active) / <alpha-value>)',
          hover: 'hsl(var(--sidebar-hover) / <alpha-value>)',
          'active-bg': 'hsl(var(--sidebar-active-bg) / <alpha-value>)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        // MUI used Roboto via Fonts.PRIMARY
        sans: ['var(--font-sans)', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        // Mirror MUI Typography overrides
        h1: ['1.25rem', { fontWeight: '700' }],   // 20px bold
        h2: ['1.125rem', { fontWeight: '700' }],  // 18px bold
        h3: ['1rem', { fontWeight: '700' }],       // 16px bold
        h6: ['0.875rem', { fontWeight: '700', letterSpacing: '0.03125rem' }],
        body1: ['1rem', { fontWeight: '400', letterSpacing: '0.03125rem' }],
        body2: ['0.875rem', { fontWeight: '400', letterSpacing: '0.015625rem' }],
        btn: ['0.8125rem', { fontWeight: '700', letterSpacing: '0.078125rem' }],
      },
      boxShadow: {
        card: '0px 1px 3px rgba(0,0,0,0.2), 0px 2px 1px rgba(0,0,0,0.12), 0px 1px 1px rgba(0,0,0,0.14)',
      },
      spacing: {
        // MUI spacing(1) = 4px (base 4)
        'mu-1': '4px',
        'mu-2': '8px',
        'mu-4': '16px',
        'mu-6': '24px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

---

## Theme Provider Component

Manages light / dark / semi-dark switching.

```tsx
// src/components/layout/ThemeProvider.tsx
'use client';
import { createContext, useContext, useEffect, useState } from 'react';

type ThemeVariant = 'light' | 'dark' | 'semi-dark';

const ThemeContext = createContext<{
  theme: ThemeVariant;
  setTheme: (t: ThemeVariant) => void;
}>({ theme: 'light', setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeVariant>('light');

  const setTheme = (t: ThemeVariant) => {
    setThemeState(t);
    document.documentElement.className = t === 'light' ? '' : t;
    localStorage.setItem('ccv_theme', t);
  };

  useEffect(() => {
    const saved = localStorage.getItem('ccv_theme') as ThemeVariant | null;
    if (saved) setTheme(saved);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

---

## Tailwind Component

| shadcn/Tailwind  
|---
| `<h1 className="text-h1">` 
| `<p className="text-body2 text-foreground/60">` 
| `<Button>` (shadcn default) 
| `<Button variant="outline">` 
| `<Button variant="ghost">` 
| `<Input>` + `<Label>` 
| `<Combobox>` (see `04-forms.md`) 
| `<Card>` (shadcn) + `shadow-card` 
| `<Separator>` 
| `<Loader2 className="animate-spin">` (lucide) 
