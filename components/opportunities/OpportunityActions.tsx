'use client';

import { useEffect, useRef, useState } from 'react';
import { toastError, toastInfo, toastSuccess } from '@/lib/toast';

type Role = 'club' | 'athlete' | 'guest';

type Props = {
  opportunityId: string;
  opportunityTitle?: string; // 👈 NUOVO
  clubId?: string;
  clubName?: string;
  compact?: boolean;
  className?: string;
};

const UNDO_WINDOW_APPLY_MS = 3000;
const UNDO_WINDOW_FOLLOW_MS = 1200;

export default function OpportunityActions({
  opportunityId,
  opportunityTitle,
  clubId,
  clubName,
  compact,
  className,
}: Props) {
  const [role, setRole] = useState<Role>('guest');

  const [appliedSet, setAppliedSet] = useState<Set<string>>(new Set());
  const [applyPendingId, setApplyPendingId] = useState<string | null>(null);
  const applyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [followSet, setFollowSet] = useState<Set<string>>(new Set());
  const [followPendingId, setFollowPendingId] = useState<string | null>(null);
  const followTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        const raw = (j?.role ?? '').toString().toLowerCase();
        const nextRole: Role = raw === 'club' || raw === 'athlete' ? raw : 'guest';
        setRole(nextRole);

        const ga = await fetch('/api/opportunities/apply', { credentials: 'include', cache: 'no-store' });
        const aj = await ga.json().catch(() => ({}));
        const aIds: string[] = Array.isArray(aj?.ids) ? aj.ids : [];
        setAppliedSet(new Set(aIds));

        if (clubId) {
          const gf = await fetch('/api/follows/toggle', { credentials: 'include', cache: 'no-store' });
          const fj = await gf.json().catch(() => ({}));
          const fIds: string[] = Array.isArray(fj?.ids) ? fj.ids : [];
          setFollowSet(new Set(fIds));
        }
      } catch {
        setAppliedSet(new Set());
        setFollowSet(new Set());
      }
    })();

    return () => {
      if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
      if (followTimerRef.current) clearTimeout(followTimerRef.current);
    };
  }, [clubId]);

  const applied = appliedSet.has(opportunityId);
  const following = !!clubId && followSet.has(clubId);

  async function toggleApply(withUndoWindow = true) {
    setApplyPendingId(opportunityId);

    const prev = new Set(appliedSet);
    const wasApplied = prev.has(opportunityId); // 👈 stato precedente per decidere toast
    const next = new Set(appliedSet);

    if (wasApplied) next.delete(opportunityId);
    else next.add(opportunityId);

    setAppliedSet(next);

    try {
      const res = await fetch('/api/opportunities/apply', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: opportunityId,
          action: wasApplied ? 'unapply' : 'apply',
          meta: {
            oppTitle: opportunityTitle,
            clubId,
            clubName,
          },
        }),
      });
      if (!res.ok) throw new Error('apply toggle failed');
      const out = await res.json().catch(() => ({}));
      if (Array.isArray(out?.ids)) setAppliedSet(new Set(out.ids));

      // Toast
      if (!wasApplied) {
        toastSuccess('Candidatura inviata');
      } else {
        toastInfo('Candidatura ritirata');
      }

      // Undo window
      if (!wasApplied && withUndoWindow) {
        if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
        applyTimerRef.current = setTimeout(() => {
          applyTimerRef.current = null;
        }, UNDO_WINDOW_APPLY_MS);
      } else if (wasApplied && applyTimerRef.current) {
        clearTimeout(applyTimerRef.current);
        applyTimerRef.current = null;
      }
    } catch (e: any) {
      setAppliedSet(prev);
      toastError(e?.message || 'Errore nell’invio/ritiro candidatura');
    } finally {
      setApplyPendingId(null);
    }
  }

  async function toggleFollow(withUndoWindow = true) {
    if (!clubId) return;
    setFollowPendingId(clubId);

    const prev = new Set(followSet);
    const wasFollowing = prev.has(clubId); // 👈 stato precedente per decidere toast
    const next = new Set(followSet);

    if (wasFollowing) next.delete(clubId);
    else next.add(clubId);

    setFollowSet(next);

    try {
      const res = await fetch('/api/follows/toggle', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clubId }),
      });
      if (!res.ok) throw new Error('follow toggle failed');
      const out = await res.json().catch(() => ({}));
      if (Array.isArray(out?.ids)) setFollowSet(new Set(out.ids));

      // Toast
      if (!wasFollowing) {
        toastSuccess('Follow attivato');
      } else {
        toastInfo('Follow rimosso');
      }

      // Undo window
      if (!wasFollowing && withUndoWindow) {
        if (followTimerRef.current) clearTimeout(followTimerRef.current);
        followTimerRef.current = setTimeout(() => {
          followTimerRef.current = null;
        }, UNDO_WINDOW_FOLLOW_MS);
      } else if (wasFollowing && followTimerRef.current) {
        clearTimeout(followTimerRef.current);
        followTimerRef.current = null;
      }
    } catch (e: any) {
      setFollowSet(prev);
      toastError(e?.message || 'Errore nel toggle follow');
    } finally {
      setFollowPendingId(null);
    }
  }

  const btnBase =
    'rounded-xl border text-sm font-semibold transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800';
  const btnPad = compact ? 'px-2.5 py-1' : 'px-3 py-1.5';

  return (
    <div className={['flex flex-wrap items-center gap-2', className || ''].join(' ')}>
      {/* Candidati */}
      {role === 'athlete' ? (
        !applied ? (
          <button
            type="button"
            onClick={() => toggleApply(true)}
            disabled={applyPendingId === opportunityId}
            aria-busy={applyPendingId === opportunityId}
            className={[btnBase, btnPad].join(' ')}
            title="Invia candidatura (stub)"
          >
            {applyPendingId === opportunityId ? '...' : 'Candidati'}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span
              className={[
                'rounded-xl border',
                btnPad,
                'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900',
              ].join(' ')}
              aria-live="polite"
            >
              {applyPendingId === opportunityId ? '...' : 'Candidatura inviata ✓'}
            </span>
            {applyTimerRef.current && (
              <button
                type="button"
                onClick={() => toggleApply(false)}
                className="text-xs underline text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                title="Annulla candidatura"
              >
                Annulla
              </button>
            )}
          </div>
        )
      ) : role === 'club' ? (
        <button type="button" className={[btnBase, btnPad].join(' ')} disabled title="Solo atleti">
          Candidati
        </button>
      ) : (
        <a href="/onboarding" className={[btnBase, btnPad].join(' ')}>
          Accedi per candidarti
        </a>
      )}

      {/* Segui club */}
      {clubId ? (
        !(followSet.has(clubId)) ? (
          <button
            type="button"
            onClick={() => toggleFollow(true)}
            disabled={followPendingId === clubId}
            aria-busy={followPendingId === clubId}
            className={[btnBase, btnPad].join(' ')}
            title={clubName ? `Segui ${clubName}` : 'Segui club'}
          >
            {followPendingId === clubId ? '...' : 'Segui club'}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span
              className={[
                'rounded-xl border',
                btnPad,
                'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900',
              ].join(' ')}
              aria-live="polite"
            >
              {followPendingId === clubId ? '...' : 'Seguito ✓'}
            </span>
            {followTimerRef.current && (
              <button
                type="button"
                onClick={() => toggleFollow(false)}
                className="text-xs underline text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                title="Annulla segui"
              >
                Annulla
              </button>
            )}
          </div>
        )
      ) : null}
    </div>
  );
}
