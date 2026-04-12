'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <p className="text-destructive">Ocurrió un error al cargar las alertas.</p>
      <Button variant="outline" onClick={reset}>
        Intentar nuevamente
      </Button>
    </div>
  );
}
