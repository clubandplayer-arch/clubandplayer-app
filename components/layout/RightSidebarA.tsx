'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';

const WhoToFollow = dynamic(() => import('@/components/feed/WhoToFollow'), {
  ssr: false,
  loading: () => <SidebarCard title="Chi seguire" />,
});

const FollowedClubs = dynamic(() => import('@/components/feed/FollowedClubs'), {
  ssr: false,
  loading: () => <SidebarCard title="I profili che segui" />,
});

const FeedHighlights = dynamic(() => import('@/components/feed/FeedHighlights'), {
  ssr: false,
  loading: () => <SidebarCard title="In evidenza" />,
});

export default function RightSidebarA() {
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-16 self-start space-y-4">
        <SidebarCard>
          <WhoToFollow />
        </SidebarCard>

        <SidebarCard>
          <FollowedClubs />
        </SidebarCard>

        <SidebarCard>
          <FeedHighlights />
        </SidebarCard>
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
