import Link from 'next/link';
import WhoToFollow from '@/components/feed/WhoToFollow';

export default function WhoToFollowPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <h1 className="heading-h1">Chi seguire</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">Suggerimenti per te</p>
          </div>
          <Link href="/following" className="text-sm font-semibold text-[var(--brand)] hover:underline">
            Vai a Following
          </Link>
        </div>
      </div>

      <WhoToFollow variant="page" visibleLimit={20} prefetchLimit={40} />
    </div>
  );
}
