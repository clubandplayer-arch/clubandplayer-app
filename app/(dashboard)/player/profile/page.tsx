'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProfileEditForm from '@/components/profiles/ProfileEditForm';

type Role = 'club' | 'athlete' | 'staff' | 'fan' | 'guest';

export default function ProfilePage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('guest');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        const raw = (j?.role ?? '').toString().toLowerCase();
        if (cancelled) return;
        if (raw === 'club') {
          setRole('club');
          router.replace('/club/profile');
          return;
        }
        if (raw === 'fan') {
          setRole('fan');
          router.replace('/fan/profile');
          return;
        }
        setRole(raw === 'athlete' || raw === 'staff' ? (raw as 'athlete' | 'staff') : 'guest');
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking || role === 'club' || role === 'fan') {
    return (
      <div className="p-4 text-sm text-gray-600">Reindirizzamento in corso…</div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{role === 'staff' ? 'Il mio profilo Staff' : 'Il mio profilo Player'}</h1>
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-semibold">Completa il tuo profilo per continuare.</p>
        <p>Questi dati servono per identificarti correttamente all&apos;interno di Club &amp; Player.</p>
      </div>
      <ProfileEditForm />
    </div>
  );
}
