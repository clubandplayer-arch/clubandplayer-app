'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FanProfileForm from '@/components/profiles/FanProfileForm';

export default function FanProfilePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        const role = (json?.role ?? '').toString().toLowerCase();
        if (cancelled) return;

        if (role === 'club') {
          router.replace('/club/profile');
          return;
        }
        if (role === 'athlete') {
          router.replace('/player/profile');
          return;
        }
        if (role !== 'fan') {
          router.replace('/login?next=%2Ffan%2Fprofile');
          return;
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking) return <div className="p-4 text-sm text-gray-600">Verifica accesso…</div>;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Il mio profilo Fan</h1>
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-semibold">Completa il tuo profilo per continuare.</p>
        <p>Questi dati servono per identificarti correttamente all&apos;interno di Club &amp; Player.</p>
      </div>
      <FanProfileForm />
    </div>
  );
}
