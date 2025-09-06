'use client';

import AuthGuard from '@/components/auth/AuthGuard';
import DashboardNav from '@/components/layout/DashboardNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-dvh flex flex-col bg-gray-50">
        <DashboardNav />
        <main className="flex-1">{children}</main>
      </div>
    </AuthGuard>
  );
}
