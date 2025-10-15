'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

type P = {
  full_name?: string | null;
  display_name?: string | null;
  bio?: string | null;
  birth_year?: number | null;
  city?: string | null;
  foot?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  interest_region_id?: number | null;
  interest_province_id?: number | null;
  interest_municipality_id?: number | null;
  avatar_url?: string | null;
};

type Row = { id: number; name: string };

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ProfileMiniCard() {
  const [p, setP] = useState<P | null>(null);
  const [place, setPlace] = useState<string>('—');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const j = await r.json();
        setP(j || {});
        // calcola etichetta luogo (residenza o interesse)
        let label = (j?.city ?? '').trim();
        if (!label) {
          const [mun, prov, reg] = await Promise.all([
            j?.interest_municipality_id
              ? supabase.from('municipalities').select('id,name').eq('id', j.interest_municipality_id).maybeSingle()
              : Promise.resolve({ data: null }),
            j?.interest_province_id
              ? supabase.from('provinces').select('id,name').eq('id', j.interest_province_id).maybeSingle()
              : Promise.resolve({ data: null }),
            j?.interest_region_id
              ? supabase.from('regions').select('id,name').eq('id', j.interest_region_id).maybeSingle()
              : Promise.resolve({ data: null }),
          ]);
          const m = (mun as any)?.data as Row | null;
          const pr = (prov as any)?.data as Row | null;
          const re = (reg as any)?.data as Row | null;
          label = [m?.name, pr?.name, re?.name].filter(Boolean).join(', ');
        }
        setPlace(label || '—');
      } catch {
        setP({});
      }
    })();
  }, []);

  const year = new Date().getFullYear();
  const age = p?.birth_year ? Math.max(0, year - p.birth_year) : null;
  const name = p?.full_name || p?.display_name || 'Benvenuto!';

  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-gray-200" />
        <div>
          <div className="text-base font-semibold">{name}</div>
          <div className="text-xs text-gray-600">{place}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-gray-500">Età:</span> {age ?? '—'}</div>
        <div><span className="text-gray-500">Piede:</span> {p?.foot || '—'}</div>
        <div><span className="text-gray-500">Altezza:</span> {p?.height_cm ? `${p.height_cm} cm` : '—'}</div>
        <div><span className="text-gray-500">Peso:</span> {p?.weight_kg ? `${p.weight_kg} kg` : '—'}</div>
      </div>

      {p?.bio ? (
        <p className="mt-3 line-clamp-3 text-sm text-gray-700">{p.bio}</p>
      ) : null}

      <div className="mt-4">
        <Link href="/profile" className="inline-block rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50">
          Modifica profilo
        </Link>
      </div>
    </div>
  );
}
