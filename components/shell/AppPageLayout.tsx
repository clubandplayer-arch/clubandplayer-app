import type { ReactNode } from 'react';
import RoleGate from '@/components/auth/RoleGate';
import AppShell from '@/components/shell/AppShell';

export default function AppPageLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGate>
      <AppShell>{children}</AppShell>
    </RoleGate>
  );
}
