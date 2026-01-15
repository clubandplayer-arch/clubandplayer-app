'use client';

import { usePathname } from 'next/navigation';
import AdSlot from '@/components/ads/AdSlot';

export default function RightSidebarB() {
  const pathname = usePathname();

  return (
    <aside className="hidden xl:block min-w-0">
      <div
        className="sticky top-16 self-start space-y-4 max-h-[calc(100vh-4rem)] overflow-auto pr-1"
        data-ads-sticky="right"
      >
        <AdSlot slot="sidebar_top" page={pathname} imageAspect="portraitShort" />
        <AdSlot slot="sidebar_bottom" page={pathname} imageAspect="landscape" />
      </div>
    </aside>
  );
}
