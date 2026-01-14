'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import RightRailAds from '@/components/ads/RightRailAds';
import RightRailContent from '@/components/layout/RightRailContent';
import { AdsServeCoordinatorProvider } from '@/components/ads/AdsServeCoordinator';

export default function DashboardAdsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const coordinatorKey = useMemo(() => `ads-${pathname || 'unknown'}`, [pathname]);

  return (
    <AdsServeCoordinatorProvider key={coordinatorKey}>
      <div className="mx-auto w-full max-w-[1600px] px-4 pt-4 lg:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] min-[1400px]:grid-cols-[minmax(0,1fr)_320px_260px]">
          <div className="min-w-0">{children}</div>
          <RightRailContent />
          <RightRailAds />
        </div>
      </div>
    </AdsServeCoordinatorProvider>
  );
}
