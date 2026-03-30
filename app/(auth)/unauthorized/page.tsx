'use client';

import { useClerk } from '@clerk/nextjs';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  const { signOut } = useClerk();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center gap-6">
      <ShieldX className="h-16 w-16 text-destructive" strokeWidth={1.5} />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Acceso no autorizado</h1>
        <p className="text-muted-foreground max-w-sm">
          Tu cuenta no tiene permisos para acceder a esta aplicación.
          Contacta al administrador.
        </p>
      </div>

      <Button
        variant="destructive"
        onClick={() => signOut({ redirectUrl: '/sign-in' })}
      >
        Cerrar sesión
      </Button>
    </div>
  );
}
