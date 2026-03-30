import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { LanguageProvider } from '@/hooks/use-language';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const { userId, orgRole } = await auth();

  if (!userId) redirect('/sign-in');
  if (orgRole !== 'org:admin') redirect('/unauthorized');

  return (
    <LanguageProvider>
      <AppShell>{children}</AppShell>
    </LanguageProvider>
  );
}
