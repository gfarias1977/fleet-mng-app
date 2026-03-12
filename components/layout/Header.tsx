'use client';

import { UserButton } from '@clerk/nextjs';
import {
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  PanelLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSidebar } from '@/components/ui/sidebar';
import { useLanguage } from '@/hooks/use-language';
import { SidebarPosition } from '@/components/layout/AppShell';

interface HeaderProps {
  sidebarPosition: SidebarPosition;
  onPositionChange: (position: SidebarPosition) => void;
}

const positionIcons: Record<SidebarPosition, React.ReactNode> = {
  left: <AlignLeft className="h-4 w-4" />,
  right: <AlignRight className="h-4 w-4" />,
  top: <ArrowUp className="h-4 w-4" />,
  bottom: <ArrowDown className="h-4 w-4" />,
};

export function Header({ sidebarPosition, onPositionChange }: HeaderProps) {
  const { t, language, setLanguage } = useLanguage();
  const { toggleSidebar, isMobile } = useSidebar();

  const positions: SidebarPosition[] = ['left', 'right', 'top', 'bottom'];

  return (
    <header className="flex items-center justify-between border-b bg-background px-4 h-14 shrink-0">
      <div className="flex items-center gap-3">
        {(sidebarPosition === 'left' || sidebarPosition === 'right') && (
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
            <PanelLeft className="h-4 w-4" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        )}
        <span className="font-semibold text-sm">{t('app.name')}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Language toggle */}
        <div className="flex items-center border rounded-md overflow-hidden">
          <Button
            variant={language === 'en' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 rounded-none px-2 text-xs"
            onClick={() => setLanguage('en')}
          >
            EN
          </Button>
          <Button
            variant={language === 'es' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 rounded-none px-2 text-xs"
            onClick={() => setLanguage('es')}
          >
            ES
          </Button>
        </div>

        {/* Sidebar position selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              {positionIcons[sidebarPosition]}
              <span className="sr-only">{t('header.sidebarPosition')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('header.sidebarPosition')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {positions.map((pos) => (
              <DropdownMenuItem
                key={pos}
                onClick={() => onPositionChange(pos)}
                className={sidebarPosition === pos ? 'bg-accent' : ''}
              >
                <span className="mr-2">{positionIcons[pos]}</span>
                {t(`header.position.${pos}` as Parameters<typeof t>[0])}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clerk UserButton */}
        <UserButton />
      </div>
    </header>
  );
}
