'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: 'Feed' },
  { href: '/rooms', label: 'Rooms' },
  { href: '/avatar', label: 'Avatar' },
  { href: '/messages', label: 'DMs' },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <header className="glass-panel fixed inset-x-0 top-0 z-30 flex h-16 items-center gap-3 px-4 lg:hidden">
      <Link href="/" className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-vybe-primary to-vybe-accent text-sm font-black text-white">
          V
        </span>
        <span className="text-sm font-black tracking-[0.2em]">VYBE</span>
      </Link>
      <nav className="ml-auto flex items-center gap-1">
        {ITEMS.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${
                active ? 'bg-vybe-primary/20 text-vybe-accent' : 'text-vybe-text-secondary'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
