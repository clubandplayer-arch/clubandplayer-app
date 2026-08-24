'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FanProfileForm from '@/components/profiles/FanProfileForm';
import { useI18n } from '@/components/i18n/I18nProvider';

export default function FanProfilePage() {
  const { t } = useI18n();
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

  if (checking) return <div className="p-4 text-sm text-gray-600">{t('profile.checkingAccess')}</div>;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">{t('profile.myFan')}</h1>
      <p className="text-sm text-gray-600">{t('profile.fanHelp')}</p>
      <FanProfileForm />
    </div>
  );
}
