import type { ReactNode } from 'react';
import ToastHub from '@/components/ui/ToastHub';

export default function DashboardTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Toast globali per tutto il gruppo (dashboard) */}
      <ToastHub />
      {children}
    </>
  );
}
