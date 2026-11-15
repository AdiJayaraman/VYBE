'use client';

import type { ReactNode } from 'react';
import { AuthPanel } from '@/components/AuthPanel';
import { MobileNav } from '@/components/MobileNav';
import { Sidebar } from '@/components/Sidebar';
import { useSession } from '@/lib/session';

/** Renders the app chrome only once a real VYBE session exists. */
export function AppShell({ children }: { children: ReactNode }) {
  const { status, token } = useSession();

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-vybe-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-vybe-primary border-t-vybe-accent" />
          <p className="text-[10px] uppercase tracking-[0.28em] text-vybe-text-secondary">
            syncing your vibe…
          </p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <AuthPanel />;
  }

  return (
    <div className="flex min-h-screen">
      <MobileNav />
      <Sidebar />
      <main className="flex min-h-screen flex-1 flex-col pt-16 lg:pt-0 lg:pl-[264px]">{children}</main>
    </div>
  );
}
