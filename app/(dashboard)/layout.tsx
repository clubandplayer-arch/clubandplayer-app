import type { ReactNode } from 'react';
import AppPageLayout from '@/components/shell/AppPageLayout';
import DashboardAdsLayout from '@/components/ads/DashboardAdsLayout';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AppPageLayout>
      <DashboardAdsLayout>{children}</DashboardAdsLayout>
    </AppPageLayout>
  );
}
