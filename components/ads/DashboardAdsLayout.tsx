'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import RightAdsSidebar from '@/components/ads/RightAdsSidebar';
import { AdsServeCoordinatorProvider } from '@/components/ads/AdsServeCoordinator';

export default function DashboardAdsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const coordinatorKey = useMemo(() => `ads-${pathname || 'unknown'}`, [pathname]);

  return (
    <AdsServeCoordinatorProvider key={coordinatorKey}>
      <div className="w-full lg:flex lg:items-start lg:gap-6">
        <div className="min-w-0 flex-1">{children}</div>
        <RightAdsSidebar />
      </div>
    </AdsServeCoordinatorProvider>
  );
}
