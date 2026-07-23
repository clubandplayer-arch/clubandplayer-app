'use client';

import { useState } from 'react';

type FanVoteButtonProps = {
  playerProfileId: string;
  initialVotedByMe?: boolean;
  initialVoteCount?: number;
  initialUsedVotes?: number;
  initialRemainingVotes?: number;
  votingOpen?: boolean;
  canVote?: boolean;
  votingEndsAt?: string | null;
  onChange?: (state: { votedByMe: boolean; voteCount: number; usedVotes: number; remainingVotes: number }) => void;
};

export default function FanVoteButton({
  playerProfileId,
  initialVotedByMe = false,
  initialVoteCount = 0,
  initialUsedVotes = 0,
  initialRemainingVotes = 5,
  votingOpen = false,
  canVote = false,
  votingEndsAt = null,
  onChange,
}: FanVoteButtonProps) {
  const [votedByMe, setVotedByMe] = useState(initialVotedByMe);
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [usedVotes, setUsedVotes] = useState(initialUsedVotes);
  const [remainingVotes, setRemainingVotes] = useState(initialRemainingVotes);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!canVote) {
    return null;
  }

  const disabledForLimit = !votedByMe && remainingVotes <= 0;
  const disabled = loading || !votingOpen || disabledForLimit;
  const label = !votingOpen
    ? 'Votazioni chiuse'
    : votedByMe
      ? 'Votato ★'
      : disabledForLimit
        ? '5/5 preferenze usate'
        : 'Vota ★';

  const submit = async () => {
    if (disabled) return;
    setLoading(true);
    setMessage(null);
    try {
      const action = votedByMe ? 'remove' : 'vote';
      const res = await fetch(`/api/profiles/${playerProfileId}/fan-vote`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.error || 'Impossibile salvare il voto');

      const next = {
        votedByMe: Boolean((json as any)?.votedByMe),
        voteCount: Number((json as any)?.voteCount ?? voteCount),
        usedVotes: Number((json as any)?.usedVotes ?? usedVotes),
        remainingVotes: Number((json as any)?.remainingVotes ?? remainingVotes),
      };
      setVotedByMe(next.votedByMe);
      setVoteCount(next.voteCount);
      setUsedVotes(next.usedVotes);
      setRemainingVotes(next.remainingVotes);
      setMessage(next.votedByMe ? 'Voto registrato.' : 'Voto rimosso.');
      onChange?.(next);
    } catch (error: any) {
      setMessage(error?.message || 'Errore nel voto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1 text-xs md:items-end">
      <button
        type="button"
        onClick={submit}
        disabled={disabled}
        className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Salvataggio…' : label}
      </button>
      <span className="text-neutral-500">
        {usedVotes}/5 preferenze usate{votingOpen && votingEndsAt ? ` · fino al ${votingEndsAt}` : ''}
      </span>
      {message ? <span className={message.includes('Errore') || message.includes('Impossibile') ? 'text-red-600' : 'text-emerald-700'}>{message}</span> : null}
    </div>
  );
}
