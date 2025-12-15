import type { ReactNode } from 'react';
import AppPageLayout from '@/components/shell/AppPageLayout';

export default function AthletesLayout({ children }: { children: ReactNode }) {
  return <AppPageLayout>{children}</AppPageLayout>;
}
