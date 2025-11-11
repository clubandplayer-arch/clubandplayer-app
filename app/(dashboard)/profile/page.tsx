'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProfileEditForm from '@/components/profiles/ProfileEditForm';

type Role = 'club' | 'athlete' | 'guest';

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
        setRole(raw === 'athlete' ? 'athlete' : 'guest');
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking || role === 'club') {
    return (
      <div className="p-4 text-sm text-gray-600">Reindirizzamento in corso…</div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Il mio profilo atleta</h1>
      <p className="text-sm text-gray-600">
        Aggiorna i tuoi dati per migliorare il matching con club e opportunità.
      </p>
      <ProfileEditForm />
    </div>
  );
}
