// app/(authenticated)/layout.tsx
import type { ReactNode } from 'react';
import RoleGate from '@/components/auth/RoleGate';

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>
        <RoleGate />
        {children}
      </body>
    </html>
  );
}
