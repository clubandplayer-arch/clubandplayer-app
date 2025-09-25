'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

function useDebounced<T>(value: T, delay = 400) {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDeb(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return deb;
}

export default function SearchInput({ placeholder = 'Search clubs...' }: { placeholder?: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const initialQ = sp.get('q') ?? '';
  const [q, setQ] = useState(initialQ);
  const deb = useDebounced(q, 400);

  // se cambia dall'esterno (navigazione), aggiorna campo
  useEffect(() => setQ(initialQ), [initialQ]);

  useEffect(() => {
    const params = new URLSearchParams(sp);
    if (deb) {
      params.set('q', deb);
      params.set('page', '1'); // reset alla prima pagina quando si cerca
    } else {
      params.delete('q');
      params.set('page', '1');
    }
    router.replace(`/clubs?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deb]);

  return (
    <input
      value={q}
      onChange={(e) => setQ(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border px-4 py-2 outline-none focus:ring md:w-80"
      aria-label="Search clubs"
    />
  );
}
