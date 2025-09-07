'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ApplyButton from './ApplyButton';

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
  ownerId: string | null;
}) {
  const [meId, setMeId] = useState<string | null>(null);
  const [meType, setMeType] = useState<'athlete' | 'club' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stop = false;
    (async () => {
      setLoading(true);
      try {
        // whoami: gestisci sia { user: { id } } che { id }
        const r1 = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j1 = await r1.json().catch(() => ({}));
        const uid: string | null = j1?.user?.id ?? j1?.id ?? j1?.user_id ?? null;
        if (!stop) setMeId(uid);

        // profilo: gestisci sia { data: { type } } che { type }
        const r2 = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const j2 = await r2.json().catch(() => ({}));
        const type = j2?.data?.type ?? j2?.type ?? null;
        if (!stop) setMeType(type);
      } catch {
        if (!stop) {
          setMeId(null);
          setMeType(null);
        }
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => { stop = true; };
  }, []);

  if (loading) return <span className="text-gray-400">…</span>;

  // Owner (solo se ownerId è noto e coincide)
  if (ownerId && meId && meId === ownerId) {
    return (
      <Link
        href={`/opportunities/${opportunityId}/applications`}
        className="text-sm underline underline-offset-2"
      >
        Candidature
      </Link>
    );
  }

  // Non atleti non possono candidarsi (UI)
  if (meType !== 'athlete') {
    return <span className="text-xs rounded px-2 py-1 bg-gray-100 text-gray-600">Solo atleti</span>;
  }

  // Atleta non owner -> può candidarsi
  return <ApplyButton opportunityId={opportunityId} />;
}
