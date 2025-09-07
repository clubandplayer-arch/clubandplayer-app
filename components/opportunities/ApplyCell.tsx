'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ApplyButton from './ApplyButton';

export default function ApplyCell({
  opportunityId,
  ownerId,
}: {
  opportunityId: string;
  ownerId: string | null;
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

  if (meId === null || meType === null) return <span className="text-gray-400">—</span>;

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

  if (meType !== 'athlete') {
    return <span className="text-xs rounded px-2 py-1 bg-gray-100 text-gray-600">Solo atleti</span>;
  }

  return <ApplyButton opportunityId={opportunityId} />;
}
