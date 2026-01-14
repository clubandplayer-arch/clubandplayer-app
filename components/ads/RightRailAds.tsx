'use client';

import { usePathname } from 'next/navigation';
import AdSlot from '@/components/ads/AdSlot';

export default function RightRailAds() {
  const pathname = usePathname();
  const isFeed = pathname === '/feed' || pathname.startsWith('/feed/');
  const stickyClasses = isFeed ? 'lg:sticky lg:top-16' : '';

  return (
    <aside className="hidden min-[1400px]:block">
      <div className={`space-y-4 ${stickyClasses}`} data-ads-sticky="right">
        <AdSlot slot="sidebar_top" page={pathname} imageAspect="portraitShort" />
        <AdSlot slot="sidebar_bottom" page={pathname} imageAspect="landscape" />
      </div>
    </aside>
  );
}
