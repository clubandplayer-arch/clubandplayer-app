'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/components/i18n/I18nProvider';

type Props = {
  playerProfileId: string;
  visible: boolean;
};

export default function ClubRosterToggleButton({ playerProfileId, visible }: Props) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [inRoster, setInRoster] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cleanId = useMemo(() => playerProfileId.trim(), [playerProfileId]);

  useEffect(() => {
    if (!visible || !cleanId) return;
    let aborted = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/clubs/me/roster', { credentials: 'include', cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || t('roster.loadError'));
        const roster = Array.isArray(data?.roster) ? data.roster : [];
        if (!aborted) {
          setInRoster(roster.some((row: any) => row?.playerProfileId === cleanId && row?.status === 'active'));
        }
      } catch (reason) {
        if (!aborted) setError(reason instanceof Error ? reason.message : t('roster.loadError'));
      } finally {
        if (!aborted) setLoading(false);
      }
    };

    void load();
    return () => { aborted = true; };
  }, [cleanId, t, visible]);

  if (!visible || !cleanId) return null;

  const handleToggle = async () => {
    if (pending) return;
    const next = !inRoster;
    setPending(true);
    setError(null);
    setInRoster(next);

    try {
      const response = await fetch('/api/clubs/me/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ playerProfileId: cleanId, inRoster: next }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || t('roster.saveError'));
      setInRoster(data?.inRoster === true);
    } catch (reason) {
      setInRoster(!next);
      setError(reason instanceof Error ? reason.message : t('roster.saveError'));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading || pending}
        className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
          inRoster ? 'bg-pink-100 text-pink-800 hover:bg-pink-200' : 'bg-pink-600 text-white hover:bg-pink-500'
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {loading ? t('roster.checking') : pending ? t('roster.updating') : inRoster ? t('following.inRoster') : t('roster.add')}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
