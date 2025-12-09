import Link from 'next/link';

type MediaEmptyStateProps = {
  kind: 'video' | 'photo';
};

export function MediaEmptyState({ kind }: MediaEmptyStateProps) {
  const isVideo = kind === 'video';
  const title = isVideo ? 'Nessun video nella tua libreria' : 'Nessuna foto nella tua libreria';
  const subtitle = isVideo
    ? 'Ogni volta che pubblichi un video sulla bacheca, lo ritrovi qui. Puoi usare questa sezione come archivio personale dei tuoi contenuti.'
    : 'Ogni volta che pubblichi una foto sulla bacheca, la ritrovi qui. Puoi usare questa sezione come archivio personale dei tuoi contenuti.';

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-cp-border-soft bg-muted/40 px-8 py-12 text-center shadow-inner">
      <div className="mb-4 text-4xl">{isVideo ? '🎬' : '📷'}</div>
      <h3 className="mb-2 text-lg font-semibold text-cp-brand">{title}</h3>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
      <Link
        href="/feed"
        className="text-sm font-semibold text-cp-brand underline-offset-2 transition hover:underline"
      >
        Vai al feed e pubblica dal tuo profilo
      </Link>
    </div>
  );
}
