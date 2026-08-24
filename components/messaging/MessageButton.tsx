'use client';
import { useI18n } from '@/components/i18n/I18nProvider';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/common/ToastProvider';
import { openDirectConversation } from '@/lib/services/messaging';

type Props = {
  targetProfileId: string;
  label?: string;
  className?: string;
};

export function MessageButton({ targetProfileId, label, className }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const { show } = useToast();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    const target = (targetProfileId || '').trim();
    if (!target || loading) return;
    setLoading(true);
    try {
      await openDirectConversation(target, { router, source: 'message-button' });
    } catch (error: any) {
      console.error('[direct-messages] message-button navigation failed', { target, error });
      show(error?.message || t('messages.openError'), { variant: 'error' });
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
      {loading ? t('auth.wait') : label ?? t('profile.message')}
    </button>
  );
}
