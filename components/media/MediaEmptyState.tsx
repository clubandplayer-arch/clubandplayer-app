import Link from 'next/link';

type MediaEmptyStateProps = {
  kind: 'video' | 'photo';
};

export function MediaEmptyState({ kind }: MediaEmptyStateProps) {
  const isVideo = kind === 'video';
  const title = isVideo ? 'Ancora nessun video' : 'Ancora nessuna foto';
  const subtitle = isVideo
    ? 'I tuoi video pubblicati nel feed appariranno qui.'
    : 'Le tue foto pubblicate nel feed appariranno qui.';

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-cp-border-soft bg-background/60 px-6 py-10 text-center">
      <div className="mb-3 text-4xl">{isVideo ? '🎬' : '📷'}</div>
      <h3 className="mb-1 text-base font-semibold text-cp-brand">{title}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{subtitle}</p>
      <Link href="/feed" className="text-sm font-medium text-cp-brand hover:underline">
        Vai al feed e pubblica il tuo primo contenuto
      </Link>
    </div>
  );
}
