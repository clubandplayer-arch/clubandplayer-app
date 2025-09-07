'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ApplyButton from '@/components/opportunities/ApplyButton';

/**
 * Azione per riga:
 * - owner -> link "Candidature"
 * - athlete non owner -> "Candidati"
 * - altri -> badge "Solo atleti"
 */
export default function ApplyCell({
  opportunityId,
  ownerId,
}: {
  opportunityId: string;
  ownerId: string | null; // <--- accetta anche null
}) {
  const [meId, setMeId] = useState<string | null>(null);
  const [meType, setMeType] = useState<'athlete' | 'club' | null>(null);

  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const r1 = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j1 = await r1.json();
        if (!stop) setMeId(j1?.user?.id ?? null);
      } catch {}
      try {
        const r2 = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const j2 = await r2.json();
        if (!stop) setMeType(j2?.data?.type ?? null);
      } catch {}
    })();
    return () => { stop = true; };
  }, []);

  // Caricamento minimo -> segnaposto
  if (meId === null || meType === null) return <span className="text-gray-400">—</span>;

  // Se sono owner (solo se ownerId è noto)
  if (ownerId && meId === ownerId) {
    return (
      <Link
        href={`/opportunities/${opportunityId}/applications`}
        className="text-sm underline underline-offset-2"
      >
        Candidature
      </Link>
    );
  }

  // Se non sono athlete, non posso candidarmi
  if (meType !== 'athlete') {
    return <span className="text-xs rounded px-2 py-1 bg-gray-100 text-gray-600">Solo atleti</span>;
  }

  // Athlete non owner
  return <ApplyButton opportunityId={opportunityId} />;
}
