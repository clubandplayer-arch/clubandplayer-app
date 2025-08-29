"use client";

import React, { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  /** Pagina corrente (>=1) letta dal server o dallo stato client */
  currentPage: number;
  /** true se ci sono altre pagine successive */
  hasMore: boolean;
  /** label opzionale (es. "Opportunità", "Clubs") */
  label?: string;
};

export default function PrevNextPager({ currentPage, hasMore, label }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const goTo = useCallback(
    (page: number) => {
      const params = new URLSearchParams(sp.toString());
      if (page <= 1) params.delete("page");
      else params.set("page", String(page));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: true });
    },
    [pathname, router, sp]
  );

  const onPrev = useCallback(() => {
    if (currentPage > 1) goTo(currentPage - 1);
  }, [currentPage, goTo]);

  const onNext = useCallback(() => {
    if (hasMore) goTo(currentPage + 1);
  }, [currentPage, hasMore, goTo]);

  return (
    <div className="mt-4 flex items-center justify-between border-t pt-3">
      <div className="text-xs text-slate-500">
        {label ? `${label} — ` : null}Pagina <b>{currentPage}</b>
        {hasMore ? " (altre disponibili)" : " (fine lista)"}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={currentPage <= 1}
          className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-slate-50"
          aria-label="Pagina precedente"
        >
          ← Prev
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasMore}
          className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-slate-50"
          aria-label="Pagina successiva"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
