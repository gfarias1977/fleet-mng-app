import { AppShell } from '@/components/layout/AppShell';
import { LanguageProvider } from '@/hooks/use-language';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AppShell>{children}</AppShell>
    </LanguageProvider>
  );
}
