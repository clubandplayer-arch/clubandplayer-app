import type { ReactNode } from 'react';
import RoleGate from '@/components/auth/RoleGate';

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGate>
      {children}
    </RoleGate>
  );
}
