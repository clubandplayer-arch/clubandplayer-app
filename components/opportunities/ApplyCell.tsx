'use client';

import { useEffect, useState } from 'react';

type ApplyCellProps = {
  opportunityId: string;
  ownerId?: string | null;
  className?: string;
};

type WhoAmIResponse = {
  role?: string | null;
  user?: { id?: string | null } | null;
};

type ProfileResponse = {
  data?: {
    account_type?: string | null;
    profile_type?: string | null;
    type?: string | null;
  } | null;
};

type ApplicationsResponse = {
  data?: Array<{ opportunity_id: string | null }>;
};

export default function ApplyCell(props: ApplyCellProps) {
  const { opportunityId, ownerId, className } = props;

  const [meId, setMeId] = useState<string | null>(null);
  const [isAthlete, setIsAthlete] = useState<boolean>(false);
  const [loadingIdentity, setLoadingIdentity] = useState<boolean>(true);
  const [checkingApplication, setCheckingApplication] = useState<boolean>(true);
  const [alreadyApplied, setAlreadyApplied] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchIdentity() {
      try {
        const whoamiRes = await fetch('/api/auth/whoami', {
          credentials: 'include',
          cache: 'no-store',
        });
        const whoami: WhoAmIResponse = await whoamiRes.json().catch(() => ({}));

        if (cancelled) return;

        const rawRole = (whoami?.role ?? '').toString().toLowerCase();
        const userId = whoami?.user?.id ?? null;

        if (userId) {
          setMeId(userId);
        }

        if (rawRole === 'athlete') {
          setIsAthlete(true);
          return;
        }
        if (rawRole.includes('club')) {
          setIsAthlete(false);
          return;
        }

        const profileRes = await fetch('/api/profiles/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        const profile: ProfileResponse = await profileRes.json().catch(() => ({}));

        if (cancelled) return;

        const profileRole = (
          profile?.data?.account_type ??
          profile?.data?.profile_type ??
          profile?.data?.type ??
          ''
        )
          .toString()
          .toLowerCase();

        if (profileRole.includes('athlete') || profileRole.includes('atlet')) {
          setIsAthlete(true);
        } else if (profileRole.includes('club') || profileRole.includes('soc')) {
          setIsAthlete(false);
        }
      } finally {
        if (!cancelled) setLoadingIdentity(false);
      }
    }

    fetchIdentity();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkExistingApplication() {
      if (!isAthlete) {
        setCheckingApplication(false);
        return;
      }

      try {
        const res = await fetch('/api/applications/mine', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Impossibile verificare le candidature');

        const json: ApplicationsResponse = await res.json().catch(() => ({}));
        if (cancelled) return;

        const rows = Array.isArray(json?.data) ? json.data : [];
        setAlreadyApplied(rows.some((row) => row.opportunity_id === opportunityId));
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Errore durante la verifica delle candidature');
      } finally {
        if (!cancelled) setCheckingApplication(false);
      }
    }

    checkExistingApplication();

    return () => {
      cancelled = true;
    };
  }, [isAthlete, opportunityId]);

  const canApply =
    isAthlete &&
    !!meId &&
    !!ownerId &&
    meId !== ownerId &&
    !alreadyApplied &&
    !submitting &&
    !loadingIdentity &&
    !checkingApplication;

  async function handleApply() {
    if (!canApply) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ opportunity_id: opportunityId, note: null }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let message = text;
        try {
          const parsed = JSON.parse(text);
          message = parsed?.error ?? text;
        } catch {
          /* ignore JSON parse errors */
        }
        throw new Error(message || 'Impossibile completare la candidatura');
      }

      setAlreadyApplied(true);
    } catch (e: any) {
      setError(e?.message ?? 'Errore durante la candidatura');
    } finally {
      setSubmitting(false);
    }
  }

  if (!ownerId || (meId && ownerId === meId)) {
    return <span className={className}>—</span>;
  }

  if (!isAthlete) {
    return <span className={className}>Solo gli atleti possono candidarsi</span>;
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleApply}
        className="btn btn-outline btn-sm"
        disabled={!canApply}
      >
        {alreadyApplied ? 'Candidatura inviata' : submitting ? 'Invio…' : 'Candidati'}
      </button>

      {(loadingIdentity || checkingApplication) && (
        <div className="mt-1 text-xs text-gray-500">Verifica in corso…</div>
      )}

      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
    </div>
  );
}
