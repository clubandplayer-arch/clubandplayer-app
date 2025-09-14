'use client';

import { useEffect, useState } from 'react';

type Size = 'sm' | 'md' | 'lg';

export default function FollowButton({
  clubId,
  clubName,
  size = 'md',
  className = '',
}: {
  clubId: string;
  clubName?: string;
  size?: Size;
  className?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!clubId) return;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`/api/follows/${clubId}`, { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (!cancelled) setFollowing(Boolean(j?.following));
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Errore stato follow');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  async function toggle() {
    try {
      setErr(null);
      setLoading(true);
      if (following) {
        const r = await fetch(`/api/follows/${clubId}`, { method: 'DELETE', credentials: 'include' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setFollowing(false);
      } else {
        const r = await fetch(`/api/follows/${clubId}`, { method: 'POST', credentials: 'include' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setFollowing(true);
      }
    } catch (e: any) {
      setErr(e?.message || 'Errore');
    } finally {
      setLoading(false);
    }
  }

  const base = 'rounded-lg border px-2 py-1 text-xs';
  const sizes: Record<Size, string> = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-sm',
  };
  const label = loading ? '...' : following ? 'Seguito' : 'Segui';

  return (
    <button
      type="button"
      aria-label={following ? `Non seguire più ${clubName ?? 'club'}` : `Segui ${clubName ?? 'club'}`}
      disabled={loading}
      onClick={toggle}
      className={`${base} ${sizes[size]} ${following ? 'bg-gray-900 text-white' : ''} ${className}`}
      title={err ?? ''}
    >
      {label}
    </button>
  );
}
