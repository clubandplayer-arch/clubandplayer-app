'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import EmptyState from '@/components/common/EmptyState';
import { useI18n } from '@/components/i18n/I18nProvider';

type Opportunity = {
  id?: string | null;
  title?: string | null;
  club_id?: string | null;
  club_name?: string | null;
};

type ApplicationRow = {
  id: string;
  opportunity_id?: string | null;
  opportunity?: Opportunity | null;
  status?: string | null;
  created_at?: string | null;
};

const statusLabel = (s: string | null | undefined, t: ReturnType<typeof useI18n>['t']) => {
  const key = (s || '').toLowerCase();
  if (key === 'submitted' || key === 'in_review' || key === 'pending') return t('applications.review');
  if (key === 'accepted') return t('applications.accepted');
  if (key === 'rejected') return t('applications.rejected');
  return t('applications.review');
};

const statusBadgeClass = (s: string | null | undefined) => {
  const key = (s || '').toLowerCase();
  if (key === 'accepted') return 'bg-green-100 text-green-800';
  if (key === 'rejected') return 'bg-red-100 text-red-800';
  return 'bg-amber-100 text-amber-800';
};

export default function MyApplicationsPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [roleChecked, setRoleChecked] = useState(false);
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await res.json().catch(() => ({} as any));
        const rawRole = (j?.role || '').toString().toLowerCase();
        if (rawRole === 'club') {
          router.replace('/club/applications');
          return;
        }
        if (!j?.user?.id) {
          router.replace('/login');
          return;
        }
        if (!cancelled) setRoleChecked(true);
      } catch {
        router.replace('/login');
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set('status', statusFilter);
      const res = await fetch(`/api/applications/me?${qs.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      const json = JSON.parse(text || '{}');
      setRows(Array.isArray(json?.data) ? json.data : []);
    } catch (err: any) {
      setError(err?.message || t('applications.updateError'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, t]);

  useEffect(() => {
    if (!roleChecked) return;
    load();
  }, [load, roleChecked]);

  const rowsSorted = useMemo(
    () => [...rows].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')),
    [rows],
  );

  return (
    <main className="page-shell space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{t('applications.mine')}</h1>
        <p className="text-sm text-gray-600">
          {t('applications.mineSubtitle')}
        </p>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border bg-white/80 p-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          {t('applications.status')}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="all">{t('applications.all')}</option>
            <option value="pending">{t('applications.review')}</option>
            <option value="accepted">{t('applications.acceptedPlural')}</option>
            <option value="rejected">{t('applications.rejectedPlural')}</option>
          </select>
        </label>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border bg-white/70 p-6 text-sm text-gray-600">{t('applications.loading')}</div>
      ) : rowsSorted.length === 0 ? (
        <EmptyState
          title={t('applications.sentEmptyTitle')}
          description={t('applications.sentEmptyHelp')}
          actions={[{ label: t('applications.discover'), href: '/opportunities', variant: 'primary' }]}
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {rowsSorted.map((row) => {
              const oppTitle = (row.opportunity?.title || '').trim() || t('applications.ad');
              const clubName = row.opportunity?.club_name || 'Club';
              const created = row.created_at ? new Date(row.created_at).toLocaleString(locale) : '—';

              return (
                <div key={row.id} className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-wide text-gray-500">{t('applications.opportunity')}</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {row.opportunity_id ? (
                        <Link href={`/opportunities/${row.opportunity_id}`} className="text-blue-700 hover:underline">
                          {oppTitle}
                        </Link>
                      ) : (
                        oppTitle
                      )}
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 text-sm text-gray-700">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Club</span>
                      <span className="font-medium text-gray-900">{clubName}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">{t('applications.status')}</span>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(row.status)}`}>
                        {statusLabel(row.status, t)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">{t('applications.date')}</span>
                      <span className="font-medium text-gray-900">{created}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    {row.opportunity_id ? (
                      <Link
                        href={`/opportunities/${row.opportunity_id}`}
                        className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-md border px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                      >
                        {t('opportunities.details')}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-500">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border bg-white/80 md:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-3 py-2">{t('applications.opportunity')}</th>
                  <th className="px-3 py-2">Club</th>
                  <th className="px-3 py-2">{t('applications.status')}</th>
                  <th className="px-3 py-2">{t('applications.date')}</th>
                  <th className="px-3 py-2">{t('applications.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rowsSorted.map((row) => {
                  const oppTitle = (row.opportunity?.title || '').trim() || t('applications.ad');
                  const clubName = row.opportunity?.club_name || 'Club';
                  const created = row.created_at ? new Date(row.created_at).toLocaleString(locale) : '—';

                  return (
                    <tr key={row.id} className="border-t">
                      <td className="px-3 py-3 align-top">
                        {row.opportunity_id ? (
                          <Link href={`/opportunities/${row.opportunity_id}`} className="text-blue-700 hover:underline">
                            {oppTitle}
                          </Link>
                        ) : (
                          oppTitle
                        )}
                      </td>
                      <td className="px-3 py-3 align-top text-gray-800">{clubName}</td>
                      <td className="whitespace-nowrap px-3 py-3 align-top">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(row.status)}`}>
                          {statusLabel(row.status, t)}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top text-gray-700">{created}</td>
                      <td className="whitespace-nowrap px-3 py-3 align-top">
                        {row.opportunity_id ? (
                          <Link
                            href={`/opportunities/${row.opportunity_id}`}
                            className="inline-flex min-w-max items-center justify-center whitespace-nowrap rounded-md border px-3 py-1 text-sm text-blue-700 hover:bg-blue-50"
                          >
                            {t('opportunities.details')}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
