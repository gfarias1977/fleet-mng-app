import { SignIn } from '@clerk/nextjs';

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function SignInPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left — branding */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-slate-900 px-12 gap-8">
        <div className="flex flex-col items-center gap-6 text-white text-center">
          {/* Replace with <Image src="/logo.png" .../> once logo is added to /public */}
          <div className="w-24 h-24 rounded-2xl bg-slate-700 flex items-center justify-center text-4xl font-bold select-none">
            TF
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">TechForge Fleet</h1>
            <p className="mt-2 text-slate-400 text-sm">
              Gestión de flota, geocercas y telemetría en tiempo real
            </p>
          </div>
        </div>
      </div>

      {/* Right — Clerk sign-in */}
      <div className="flex flex-col items-center justify-center px-6 py-12 bg-background">
        {/* Mobile branding */}
        <div className="flex lg:hidden flex-col items-center gap-3 mb-8 text-center">
          <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center text-xl font-bold text-white select-none">
            TF
          </div>
          <h1 className="text-2xl font-bold">TechForge Fleet</h1>
          <p className="text-muted-foreground text-sm">
            Gestión de flota, geocercas y telemetría
          </p>
        </div>

        {error === 'unauthorized' && (
          <div className="mb-4 w-full max-w-sm rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Tu cuenta no tiene permisos de administrador para acceder a esta aplicación.
          </div>
        )}

        <SignIn
          appearance={{
            elements: {
              rootBox: 'w-full max-w-sm',
              card: 'shadow-none border border-border rounded-xl',
              socialButtonsBlockButton: 'hidden',
              socialButtonsProviderIcon: 'hidden',
              dividerRow: 'hidden',
              footerAction: 'hidden',
            },
          }}
        />
      </div>
    </div>
  );
}
