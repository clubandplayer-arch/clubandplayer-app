'use client';

import { useEffect, useState } from 'react';
import ProfileForm from '@/components/profiles/ProfileForm';
import type { Profile } from '@/types/profile';

export default function OnboardingPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const j = await res.json();
        if (!cancelled) setProfile(j?.data ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{profile ? 'Modifica profilo' : 'Completa il tuo profilo'}</h1>
      {loading && <div className="h-64 w-full rounded-2xl bg-gray-200 animate-pulse" />}
      {!loading && (
        <ProfileForm
          initial={profile ?? undefined}
          onSaved={(p)=>{ setProfile(p); alert('Profilo salvato!'); }}
        />
      )}
    </div>
  );
}
