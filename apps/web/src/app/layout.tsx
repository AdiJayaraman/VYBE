import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { MobileNav } from '@/components/MobileNav';
import { Sidebar } from '@/components/Sidebar';
import { SessionProvider } from '@/lib/session';
import './globals.css';

export const metadata: Metadata = {
  title: 'VYBE — Hybrid 2D/3D Social',
  description: 'A spatial social network: scroll the feed, then step into the room.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-vybe-background text-vybe-text-primary antialiased">
        <SessionProvider>
          <div className="flex min-h-screen">
            <MobileNav />
            <Sidebar />
            <main className="flex min-h-screen flex-1 flex-col pt-16 lg:pt-0 lg:pl-[264px]">
              {children}
            </main>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
