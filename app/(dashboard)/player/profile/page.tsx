'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProfileEditForm from '@/components/profiles/ProfileEditForm';
import { useI18n } from '@/components/i18n/I18nProvider';

type Role = 'club' | 'athlete' | 'staff' | 'fan' | 'admin' | 'guest';

export default function ProfilePage() {
  const { t } = useI18n();
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
        if (raw === 'admin') {
          setRole('admin');
          router.replace('/admin/profile');
          return;
        }
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

  if (checking || role === 'admin' || role === 'club' || role === 'fan') {
    return (
      <div className="p-4 text-sm text-gray-600">{t('profile.redirecting')}</div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{role === 'staff' ? t('profile.myStaff') : t('profile.myPlayer')}</h1>
      <p className="text-sm text-gray-600">
        {t('profile.matchingHelp')}
      </p>
      <ProfileEditForm />
    </div>
  );
}
