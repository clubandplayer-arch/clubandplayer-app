import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fanVoteSummaryReadKey,
  hasFanVoteSummaryBeenRead,
} from '../../lib/notifications/fanVoteSummaryClient';

const summary = {
  playerProfileId: 'player-id',
  voteCount: 3,
  latestVoteAt: '2026-08-11T12:00:00.000Z',
};

test('stores one Fan Vote read cursor per player', () => {
  assert.equal(
    fanVoteSummaryReadKey(summary),
    'clubandplayer:player-fan-vote-summary-read:player-id',
  );
});

test('keeps the Fan Vote summary hidden until a newer vote arrives', () => {
  assert.equal(
    hasFanVoteSummaryBeenRead(summary, '2026-08-11T12:00:00.000Z'),
    true,
  );
  assert.equal(
    hasFanVoteSummaryBeenRead(
      { ...summary, latestVoteAt: '2026-08-11T12:01:00.000Z' },
      '2026-08-11T12:00:00.000Z',
    ),
    false,
  );
});
