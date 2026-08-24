'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import EmptyState from '@/components/common/EmptyState';
import { useToast } from '@/components/common/ToastProvider';
import { useI18n } from '@/components/i18n/I18nProvider';

type Athlete = {
  id?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  role?: string | null;
  sport?: string | null;
  avatar_url?: string | null;
  city?: string | null;
  province?: string | null;
  region?: string | null;
};

type Opportunity = {
  id?: string | null;
  title?: string | null;
  role?: string | null;
};

type ApplicationRow = {
  id: string;
  athlete_id?: string | null;
  athlete?: Athlete | null;
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

export default function ClubApplicationsPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [roleChecked, setRoleChecked] = useState(false);
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'accepted' | 'rejected' | 'all'>('pending');
  const [opportunityFilter, setOpportunityFilter] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await res.json().catch(() => ({} as any));
        const rawRole = (j?.role || '').toString().toLowerCase();
        if (rawRole !== 'club') {
          router.replace('/feed');
          return;
        }
        if (!cancelled) setRoleChecked(true);
      } catch {
        router.replace('/feed');
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const load = async (params?: { status?: string; opportunity?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      const status = params?.status ?? statusFilter;
      if (status) qs.set('status', status);
      const opp = params?.opportunity ?? opportunityFilter;
      if (opp) qs.set('opportunity_id', opp);
      const res = await fetch(`/api/applications/received?${qs.toString()}`, {
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
  };

  useEffect(() => {
    if (!roleChecked) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleChecked, statusFilter, opportunityFilter]);

  const uniqueOpportunities = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      const id = r.opportunity_id || '';
      if (!id) return;
      const title = (r.opportunity?.title || '').trim() || id;
      map.set(id, title);
    });
    return Array.from(map.entries());
  }, [rows]);

  const canAct = (s?: string | null) => {
    const key = (s || '').toLowerCase();
    return key !== 'accepted' && key !== 'rejected';
  };

  const updateStatus = async (id: string, next: 'accepted' | 'rejected') => {
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      toast.success(next === 'accepted' ? t('applications.acceptedToast') : t('applications.rejectedToast'));
      await load();
    } catch (err: any) {
      toast.error(err?.message || t('applications.updateError'));
    }
  };

  return (
    <main className="page-shell space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{t('applications.received')}</h1>
        <p className="text-sm text-gray-600">
          {t('applications.subtitle')}
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
            <option value="pending">{t('applications.review')}</option>
            <option value="accepted">{t('applications.acceptedPlural')}</option>
            <option value="rejected">{t('applications.rejectedPlural')}</option>
            <option value="all">{t('applications.all')}</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          {t('applications.opportunity')}
          <select
            value={opportunityFilter}
            onChange={(e) => setOpportunityFilter(e.target.value)}
            className="min-w-[180px] rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">{t('applications.all')}</option>
            {uniqueOpportunities.map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
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
      ) : rows.length === 0 ? (
        <EmptyState
          title={t('applications.receivedEmpty')}
          description={t('applications.receivedEmptyDescription')}
          actions={[{ label: t('applications.goToOpportunities'), href: '/opportunities', variant: 'primary' }]}
        />
      ) : (
        <>
          <div className="space-y-4 md:hidden">
            {rows.map((row) => {
              const athleteProfileId = row.athlete?.id ?? null;
              const name =
                row.athlete?.full_name?.trim() ||
                row.athlete?.display_name?.trim() ||
                t('applications.unnamed');
              const headline = [row.athlete?.role, row.athlete?.sport].filter(Boolean).join(' · ');
              const oppTitle = (row.opportunity?.title || '').trim() || row.opportunity_id || t('applications.ad');
              const created = row.created_at ? new Date(row.created_at).toLocaleString(locale) : '—';
              const canUpdate = canAct(row.status);
              const detailsHref = row.opportunity_id
                ? `/opportunities/${row.opportunity_id}`
                : athleteProfileId
                  ? `/players/${athleteProfileId}`
                  : null;

              return (
                <article key={row.id} className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold text-gray-500">{t('applications.opportunity').toUpperCase()}</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">
                    {row.opportunity_id ? (
                      <Link href={`/opportunities/${row.opportunity_id}`} className="text-blue-700 hover:underline">
                        {oppTitle}
                      </Link>
                    ) : (
                      oppTitle
                    )}
                  </div>

                  <div className="mt-3 space-y-3">
                    <div>
                      <div className="text-xs font-semibold text-gray-500">CANDIDATO</div>
                      <div className="mt-1 font-medium text-gray-900">
                        {athleteProfileId ? (
                          <Link href={`/players/${athleteProfileId}`} className="text-blue-700 hover:underline">
                            {name}
                          </Link>
                        ) : (
                          name
                        )}
                      </div>
                      {headline ? <div className="text-sm text-gray-600">{headline}</div> : null}
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold text-gray-500">STATO</div>
                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(row.status)}`}
                        >
                          {statusLabel(row.status, t)}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold text-gray-500">DATA</div>
                        <div className="text-sm text-gray-700">{created}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    {detailsHref ? (
                      <Link
                        href={detailsHref}
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        {t('opportunities.details')}
                      </Link>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={!canUpdate}
                        onClick={() => updateStatus(row.id, 'accepted')}
                        className="flex-1 rounded-md border border-green-200 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60"
                      >
                        {t('applications.accept')}
                      </button>
                      <button
                        disabled={!canUpdate}
                        onClick={() => updateStatus(row.id, 'rejected')}
                        className="flex-1 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        {t('applications.reject')}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden md:block">
            <div className="overflow-x-auto rounded-xl border bg-white/80">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-3 py-2">{t('applications.candidate')}</th>
                    <th className="px-3 py-2">{t('applications.opportunity')}</th>
                    <th className="px-3 py-2">{t('applications.status')}</th>
                    <th className="px-3 py-2">{t('applications.date')}</th>
                    <th className="px-3 py-2">{t('applications.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const athleteProfileId = row.athlete?.id ?? null;
                    const name =
                      row.athlete?.full_name?.trim() ||
                      row.athlete?.display_name?.trim() ||
                      t('applications.unnamed');
                    const headline = [row.athlete?.role, row.athlete?.sport].filter(Boolean).join(' · ');
                    const oppTitle = (row.opportunity?.title || '').trim() || row.opportunity_id || t('applications.ad');
                    const created = row.created_at ? new Date(row.created_at).toLocaleString(locale) : '—';
                    const canUpdate = canAct(row.status);

                    return (
                      <tr key={row.id} className="border-t">
                        <td className="px-3 py-3 align-top">
                          <div className="font-semibold text-gray-900">
                            {athleteProfileId ? (
                              <Link href={`/players/${athleteProfileId}`} className="text-blue-700 hover:underline">
                                {name}
                              </Link>
                            ) : (
                              name
                            )}
                          </div>
                          {headline ? <div className="text-xs text-gray-600">{headline}</div> : null}
                        </td>
                        <td className="px-3 py-3 align-top">
                          {row.opportunity_id ? (
                            <Link href={`/opportunities/${row.opportunity_id}`} className="text-blue-700 hover:underline">
                              {oppTitle}
                            </Link>
                          ) : (
                            oppTitle
                          )}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(row.status)}`}
                          >
                            {statusLabel(row.status, t)}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top text-gray-700">{created}</td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex flex-wrap gap-2">
                            <button
                              disabled={!canUpdate}
                              onClick={() => updateStatus(row.id, 'accepted')}
                              className="rounded-md border border-green-200 px-3 py-1 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60"
                            >
                              {t('applications.accept')}
                            </button>
                            <button
                              disabled={!canUpdate}
                              onClick={() => updateStatus(row.id, 'rejected')}
                              className="rounded-md border border-red-200 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                            >
                              {t('applications.reject')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
