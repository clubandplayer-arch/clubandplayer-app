import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';

const NAV_LINKS = [
  { href: '/signup', label: 'Registrati' },
  { href: '/login', label: 'Accedi' },
];

export default function MarketingNavbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <BrandLogo variant="header" href="/feed" priority className="h-8 w-auto" />

        <nav aria-label="Navigazione principale" className="flex items-center gap-2 text-sm text-neutral-700">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
