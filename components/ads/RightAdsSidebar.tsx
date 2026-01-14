'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import AdSlot from '@/components/ads/AdSlot';

const WhoToFollow = dynamic(() => import('@/components/feed/WhoToFollow'), {
  ssr: false,
  loading: () => <SidebarCard title="Chi seguire" />,
});

const FollowedClubs = dynamic(() => import('@/components/feed/FollowedClubs'), {
  ssr: false,
  loading: () => <SidebarCard title="Club che segui" />,
});

const FeedHighlights = dynamic(() => import('@/components/feed/FeedHighlights'), {
  ssr: false,
  loading: () => <SidebarCard title="In evidenza" />,
});

export default function RightAdsSidebar() {
  const pathname = usePathname();
  const isFeed = pathname === '/feed' || pathname.startsWith('/feed/');
  const stickyClasses = isFeed ? 'lg:sticky lg:top-16' : '';

  return (
    <aside className="hidden lg:block lg:w-[280px] xl:w-[320px] pt-4">
      <div className={`space-y-4 ${stickyClasses}`} data-ads-sticky="right">
        {isFeed ? (
          <>
            <SidebarCard>
              <WhoToFollow />
            </SidebarCard>

            <SidebarCard>
              <FollowedClubs />
            </SidebarCard>

            <SidebarCard>
              <FeedHighlights />
            </SidebarCard>
          </>
        ) : null}

        <AdSlot slot="sidebar_top" page={pathname} imageAspect="portraitShort" />
        <AdSlot slot="sidebar_bottom" page={pathname} imageAspect="landscape" />
      </div>
    </aside>
  );
}

function SidebarCard({
  title,
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="glass-panel">
      {title ? (
        <div className="px-4 py-3 text-sm font-semibold">{title}</div>
      ) : null}
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}
