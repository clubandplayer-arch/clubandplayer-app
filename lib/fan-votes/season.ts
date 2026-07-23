export type FanVoteSeason = {
  seasonKey: string;
  votingOpen: boolean;
  votingStartsAt: string;
  votingEndsAt: string;
};

function romeDateParts(now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: get('year'), month: get('month'), day: get('day') };
}

export function getFanVoteSeason(now = new Date()): FanVoteSeason {
  const { year, month, day } = romeDateParts(now);
  const startYear = month >= 9 ? year : year - 1;
  const endYear = startYear + 1;
  const seasonKey = `${startYear}-${endYear}`;
  const votingOpen =
    (year === startYear && month >= 9) ||
    (year === endYear && (month < 6 || (month === 5 && day <= 31)));

  return {
    seasonKey,
    votingOpen,
    votingStartsAt: `${startYear}-09-01`,
    votingEndsAt: `${endYear}-05-31`,
  };
}
