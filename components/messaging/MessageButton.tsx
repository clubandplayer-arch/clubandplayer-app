'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/common/ToastProvider';

type Props = {
  targetProfileId: string;
  label?: string;
  className?: string;
};

export function MessageButton({ targetProfileId, label = 'Messaggia', className }: Props) {
  const router = useRouter();
  const { show } = useToast();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    const target = (targetProfileId || '').trim();
    if (!target || loading) return;
    setLoading(true);
    try {
      router.push(`/messages/${target}`);
    } catch (error: any) {
      console.error('[messaging-button] navigation error', { target, error });
      show(error?.message || 'Errore apertura chat', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || !targetProfileId}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60 ${className || ''}`}
    >
      {loading ? 'Attendi…' : label}
    </button>
  );
}
