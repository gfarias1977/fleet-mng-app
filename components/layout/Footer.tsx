'use client';

import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/hooks/use-language';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="mt-auto">
      <Separator />
      <div className="flex items-center justify-between px-6 py-3 text-xs text-muted-foreground">
        <span>{t('footer.copyright')}</span>
        <span>{t('footer.version')}</span>
      </div>
    </footer>
  );
}
