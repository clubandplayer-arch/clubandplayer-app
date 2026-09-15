import type { ReactNode } from 'react';
import MarketingNavbar from '@/components/layout/MarketingNavbar';
import AppShell from '@/components/shell/AppShell';
import { getUserAndRole } from '@/lib/auth/role';

export default async function LegalLayout({ children }: { children: ReactNode }) {
  const { user } = await getUserAndRole();

  if (user) {
    return <AppShell>{children}</AppShell>;
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 pt-16">
      <MarketingNavbar />
      {children}
    </div>
  );
}
