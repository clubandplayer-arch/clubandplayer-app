// app/(dashboard)/layout.tsx
'use client';

import type { ReactNode } from 'react';
import AppShell from '@/components/shell/AppShell';
import AuthGuard from '@/components/auth/AuthGuard';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  // Tutte le route sotto (dashboard) richiedono sessione.
  // Se l’utente è guest, AuthGuard fa router.replace('/login').
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
