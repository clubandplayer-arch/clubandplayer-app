import type { ReactNode } from 'react';
import MarketingNavbar from '@/components/layout/MarketingNavbar';

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <MarketingNavbar />
      {children}
    </div>
  );
}
