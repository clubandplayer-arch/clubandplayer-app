'use client'

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';

import Link from 'next/link';
import { useI18n } from '@/components/i18n/I18nProvider';

export default function LocationSettingsPage() {
  const { t } = useI18n();
  return (
    <main className="container mx-auto py-8 max-w-2xl">
      <h1>{t('profile.location')}</h1>
      <p className="lead">{t('profile.locationMoved')}</p>
      <div className="card p-4 mt-4 space-y-3 text-sm text-gray-700">
        <p className="font-semibold">{t('profile.locationHow')}</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            {t('profile.locationSettingsBefore')} <Link className="text-blue-600 underline" href="/settings">/settings</Link>{' '}
            {t('profile.locationSettingsAfter')}
          </li>
          <li>
            {t('profile.locationAlternative')} <Link className="text-blue-600 underline" href="/player/profile">/player/profile</Link>{' '}
            {t('common.or')} <Link className="text-blue-600 underline" href="/club/profile">/club/profile</Link>.
          </li>
        </ul>
        <p className="text-xs text-gray-500">
          {t('profile.locationEndpointHelp')}
        </p>
      </div>
    </main>
  );
}
