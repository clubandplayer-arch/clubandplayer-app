'use client';

import React, { useCallback, useState } from 'react';

type Props = {
  text: string;
  title?: string;
  className?: string;
  onCopied?: () => void;
  label?: string; // testo del bottone (default: "Copia")
};

export default function CopyButton({
  text,
  title,
  className = '',
  onCopied,
  label = 'Copia',
}: Props) {
  const [ok, setOk] = useState(false);

  const copy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setOk(true);
      onCopied?.();
      setTimeout(() => setOk(false), 1200);
    } catch {
      // best effort: non alziamo errori
    }
  }, [text, onCopied]);

  return (
    <button
      type="button"
      onClick={copy}
      title={title ?? label}
      className={`rounded-lg border px-2 py-1 text-xs hover:bg-slate-50 ${className}`}
      aria-live="polite"
    >
      {ok ? 'Copiato ✓' : label}
    </button>
  );
}
