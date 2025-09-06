'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/clubs', label: 'Clubs' },   // 👈 nuovo link
  { href: '/profile', label: 'Profile' },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-white">
      <nav className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-2">
        <Link href="/" className="text-lg font-semibold mr-4">ClubAndPlayer</Link>
        <ul className="flex items-center gap-1">
          {items.map((it) => {
            const active = pathname === it.href || pathname?.startsWith(it.href + '/');
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  aria-current={active ? 'page' : undefined}
                  className={
                    'px-3 py-2 rounded-lg text-sm ' +
                    (active ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50 border')
                  }
                >
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
