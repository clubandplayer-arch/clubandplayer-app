'use client';

import { usePathname } from 'next/navigation';
import AdSlot from '@/components/ads/AdSlot';

export default function RightSidebarB() {
  const pathname = usePathname();

  return (
    <aside className="hidden xl:block min-w-0 pb-24">
      <div className="sticky top-16 self-start space-y-4" data-ads-sticky="right">
        <AdSlot slot="sidebar_top" page={pathname} imageAspect="portraitShort" />
        <AdSlot slot="sidebar_bottom" page={pathname} imageAspect="landscape" />
      </div>
    </aside>
  );
}
