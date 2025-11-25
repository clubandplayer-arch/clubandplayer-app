import type { ReactNode } from 'react';
import AppShell from '@/components/shell/AppShell';
import RoleGate from '@/components/auth/RoleGate';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGate>
      <AppShell>{children}</AppShell>
    </RoleGate>
  );
}
