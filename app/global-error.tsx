'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ padding: 20, fontFamily: 'ui-sans-serif, system-ui' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          Qualcosa è andato storto
        </h1>
        <pre
          style={{
            background: '#f8f8f8',
            padding: 12,
            borderRadius: 8,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {error?.message || 'Errore sconosciuto'}
        </pre>
        <button
          onClick={() => reset()}
          style={{
            marginTop: 12,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #ddd',
            background: 'white',
            cursor: 'pointer',
          }}
        >
          Riprova
        </button>
      </body>
    </html>
  );
}
