import type { ReactNode } from 'react';
import LegalNavbar from '@/components/layout/LegalNavbar';
import MarketingNavbar from '@/components/layout/MarketingNavbar';
import { getUserAndRole } from '@/lib/auth/role';

export default async function LegalLayout({ children }: { children: ReactNode }) {
  const { user, role } = await getUserAndRole();

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 pt-16">
      {user ? <LegalNavbar role={role} /> : <MarketingNavbar />}
      {children}
    </div>
  );
}
