'use client';

import { useEffect, useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { TopNav } from '@/components/layout/TopNav';

export type SidebarPosition = 'left' | 'top';

const STORAGE_KEY = 'sidebar-position';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [position, setPosition] = useState<SidebarPosition>('left');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as SidebarPosition | null;
    if (stored && ['left', 'top'].includes(stored)) {
      setPosition(stored);
    }
  }, []);

  function handlePositionChange(newPosition: SidebarPosition) {
    setPosition(newPosition);
    localStorage.setItem(STORAGE_KEY, newPosition);
  }

  if (position === 'top') {
    return (
      <div className="flex h-screen w-full flex-col">
        <TopNav position={position} onPositionChange={handlePositionChange} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto">{children}</main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col overflow-hidden">
          <Header sidebarPosition={position} onPositionChange={handlePositionChange} />
          <main className="flex-1 overflow-y-auto">{children}</main>
          <Footer />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
