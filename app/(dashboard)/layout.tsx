'use client';

import AuthGuard from '@/components/auth/AuthGuard';
import DashboardNav from '@/components/layout/DashboardNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DashboardNav />
      <div className="mx-auto max-w-6xl">{children}</div>
    </AuthGuard>
  );
}
