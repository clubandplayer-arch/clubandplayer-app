'use client';

import { useRouter } from 'next/navigation';
import { MaterialIcon } from '@/components/icons/MaterialIcon';
import { useUnreadDirectThreads } from '@/hooks/useUnreadDirectThreads';

type Props = {
  onClick?: () => void;
};

export default function ChatFloatingButton({ onClick }: Props) {
  const router = useRouter();
  const unreadDirectThreads = useUnreadDirectThreads();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    router.push('/messages');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Apri messaggi"
      className="fixed bottom-4 right-4 z-40 hidden items-center gap-2 rounded-full border border-neutral-200 bg-white/90 px-4 py-2 text-sm font-semibold text-neutral-700 shadow-lg backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white md:flex md:bottom-6 md:right-6"
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand)] text-white shadow-inner">
        <MaterialIcon name="mail" fontSize="small" />
      </span>
      <span className="leading-none">Messaggi</span>
      {unreadDirectThreads > 0 ? (
        <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-2 text-[11px] font-semibold text-white">
          {unreadDirectThreads > 9 ? '9+' : unreadDirectThreads}
        </span>
      ) : null}
    </button>
  );
}
