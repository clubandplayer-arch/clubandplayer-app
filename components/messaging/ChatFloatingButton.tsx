'use client';

import { useRouter } from 'next/navigation';
import { LucideMail } from '@/components/icons/LucideMail';

type Props = {
  onClick?: () => void;
};

export default function ChatFloatingButton({ onClick }: Props) {
  const router = useRouter();

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
      aria-label="Messaggi"
      className="group fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg shadow-black/10 transition hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-300 lg:right-[calc(40%+1.5rem)]"
    >
      <LucideMail className="h-5 w-5" />
      <span className="pointer-events-none absolute bottom-full right-0 mb-2 hidden whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs font-semibold text-white shadow-lg opacity-0 transition group-hover:opacity-100 lg:block">
        Messaggi
      </span>
    </button>
  );
}
