'use client';

import { useClerk } from '@clerk/nextjs';
import { useEffect } from 'react';

export default function SignOutPage() {
  const { signOut } = useClerk();

  useEffect(() => {
    signOut({ redirectUrl: '/sign-in?error=unauthorized' });
  }, [signOut]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm">Cerrando sesión…</p>
    </div>
  );
}
