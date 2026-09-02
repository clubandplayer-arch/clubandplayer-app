'use client';

import Link from 'next/link';
import { useI18n } from '@/components/i18n/I18nProvider';

type MediaEmptyStateProps = {
  kind: 'video' | 'photo';
};

export function MediaEmptyState({ kind }: MediaEmptyStateProps) {
  const { t } = useI18n();
  const isVideo = kind === 'video';
  const title = isVideo ? t('media.noVideosTitle') : t('media.noPhotosTitle');
  const subtitle = isVideo
    ? t('media.noVideosHelp')
    : t('media.noPhotosHelp');

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-cp-border-soft bg-muted/40 px-8 py-12 text-center shadow-inner">
      <div className="mb-4 text-4xl">{isVideo ? '🎬' : '📷'}</div>
      <h3 className="mb-2 text-lg font-semibold text-cp-brand">{title}</h3>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
      <Link
        href="/feed"
        className="text-sm font-semibold text-cp-brand underline-offset-2 transition hover:underline"
      >
        {t('media.publishFromFeed')}
      </Link>
    </div>
  );
}
