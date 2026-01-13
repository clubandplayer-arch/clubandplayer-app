'use client';

import { useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

type MobileSearchOverlayProps = {
  isOpen: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function MobileSearchOverlay({
  isOpen,
  query,
  onQueryChange,
  onClose,
  onSubmit,
}: MobileSearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white md:hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 pb-3 pt-4">
        <form
          className="flex flex-1 items-center"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Cerca club, player, opportunità, post, eventi…"
              aria-label="Cerca"
              className="h-12 w-full rounded-full border border-slate-200 bg-white pl-11 pr-4 text-base text-slate-700 shadow-sm transition focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
            />
          </div>
        </form>
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-medium text-slate-600 transition hover:text-slate-800"
        >
          Annulla
        </button>
      </div>
      <div className="px-4 py-4 text-sm text-slate-500">Inizia a digitare per cercare.</div>
    </div>
  );
}
