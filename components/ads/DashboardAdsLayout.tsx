'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import RightSidebarA from '@/components/layout/RightSidebarA';
import RightSidebarB from '@/components/layout/RightSidebarB';
import { AdsServeCoordinatorProvider } from '@/components/ads/AdsServeCoordinator';

export default function DashboardAdsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const coordinatorKey = useMemo(() => `ads-${pathname || 'unknown'}`, [pathname]);

  return (
    <AdsServeCoordinatorProvider key={coordinatorKey}>
      <div className="mx-auto w-full max-w-[1800px] px-4 pt-4 lg:px-6">
        <div className="grid grid-cols-1 gap-y-6 xl:grid-cols-[minmax(280px,20%)_minmax(0,40%)_minmax(280px,20%)_minmax(240px,20%)] xl:gap-x-6">
          <div className="min-w-0 xl:col-span-2">{children}</div>
          <RightSidebarA />
          <RightSidebarB />
        </div>
      </div>
    </AdsServeCoordinatorProvider>
  );
}
