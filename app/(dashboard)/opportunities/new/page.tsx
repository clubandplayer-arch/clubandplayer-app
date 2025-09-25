'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OpportunityForm from '@/components/opportunities/OpportunityForm';

type Role = 'athlete' | 'club' | 'guest';

export default function NewOpportunityPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('guest');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const r = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (c) return;
        const raw = (j?.role ?? '').toString().toLowerCase();
        const r2 = raw === 'club' || raw === 'athlete' ? (raw as Role) : 'guest';
        setRole(r2);
        setReady(true);
        if (r2 !== 'club') {
          router.replace('/opportunities');
        }
      } catch {
        if (!c) {
          setRole('guest');
          setReady(true);
          router.replace('/opportunities');
        }
      }
    })();
    return () => {
      c = true;
    };
  }, [router]);

  if (!ready) {
    return <div className="p-6 text-sm text-gray-500">Verifica permessi…</div>;
  }
  if (role !== 'club') {
    return <div className="p-6 text-sm text-gray-500">Reindirizzamento…</div>;
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-4 text-2xl font-semibold">Nuova opportunità</h1>
      <OpportunityForm
        onCancel={() => router.push('/opportunities')}
        onSaved={() => router.push('/opportunities')}
      />
    </div>
  );
}
