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
      <div className="mx-auto w-full max-w-[1760px] px-4 pt-4 lg:px-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,680px)_320px] 2xl:grid-cols-[320px_minmax(0,680px)_320px_260px]">
          <div className="min-w-0">{children}</div>
          <RightSidebarA />
          <RightSidebarB />
        </div>
      </div>
    </AdsServeCoordinatorProvider>
  );
}
