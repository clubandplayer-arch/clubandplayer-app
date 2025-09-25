'use client';

import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSavedViews } from '@/lib/hooks/useSavedViews';
import { parseFilters, buildQuery } from '@/lib/search/params';

type Props = { scope: 'clubs' | 'opportunities' };

export default function SavedViewsBar({ scope }: Props) {
  const sp = useSearchParams();
  const router = useRouter();

  const { views, loading, create, remove } = useSavedViews(scope);

  async function handleSave() {
    const filters = parseFilters(sp);
    const name = prompt('Nome della vista salvata:');
    if (!name) return;
    await create({ scope, name, filters });
  }

  function handleApply(filters: any) {
    const qs = buildQuery(filters, 1, 20);
    router.push(`/${scope}?${qs}`);
  }

  return (
    <div className="flex items-center gap-2 border-b bg-slate-50 p-2">
      <button
        onClick={handleSave}
        className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white"
        disabled={loading}
      >
        Salva vista
      </button>
      <div className="flex gap-2 overflow-x-auto">
        {views.map((v) => (
          <div
            key={v.id}
            className="flex items-center gap-1 rounded-md border bg-white px-2 py-1 text-sm shadow-sm"
          >
            <button onClick={() => handleApply(v.filters)}>{v.name}</button>
            <button onClick={() => remove(v.id)} className="ml-1 text-xs text-red-500">
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
