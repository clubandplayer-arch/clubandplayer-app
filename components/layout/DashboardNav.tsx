'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/clubs', label: 'Clubs' },
  { href: '/opportunities', label: 'Opportunità' },
  { href: '/onboarding', label: 'Profilo' },
];

export default function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="w-full border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 h-12 flex items-center gap-4">
        {items.map((it) => {
          const active = pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`px-2 py-1 rounded-md text-sm ${active ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`}
            >
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
