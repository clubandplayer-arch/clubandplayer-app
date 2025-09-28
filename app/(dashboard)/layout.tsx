import type { ReactNode } from 'react';
import AppShell from '@/components/shell/AppShell';
import SupabaseSessionSync from '@/components/auth/SupabaseSessionSync';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
