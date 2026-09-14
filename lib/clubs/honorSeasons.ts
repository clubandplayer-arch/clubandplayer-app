export function latestCompletedSeasonStart(date = new Date()): number {
  const year = date.getFullYear();
  return date.getMonth() >= 6 ? year - 1 : year - 2;
}

export function clubHonorSeasonOptions(date = new Date(), earliestStartYear = 1900): string[] {
  const latestStart = latestCompletedSeasonStart(date);
  return Array.from(
    { length: Math.max(0, latestStart - earliestStartYear + 1) },
    (_, index) => {
      const start = latestStart - index;
      return `${start}/${start + 1}`;
    },
  );
}

export function isClubHonorSeasonAvailable(value: unknown, date = new Date()): value is string {
  if (typeof value !== 'string' || !/^\d{4}\/\d{4}$/.test(value)) return false;
  const [start, end] = value.split('/').map(Number);
  return end === start + 1 && start >= 1900 && start <= latestCompletedSeasonStart(date);
}
