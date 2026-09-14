import { normalizeSport } from '@/lib/opps/constants';

export const PAST_EXPERIENCES_START_SEASON_YEAR = 2000;

export type PastExperienceInput = {
  season?: string | null;
  club?: string | null;
  sport?: string | null;
  category?: string | null;
  organizationId?: string | null;
  categoryId?: string | null;
  role?: string | null;
  primarySport?: {
    sportId?: string | null;
    disciplineId?: string | null;
    variantId?: string | null;
  } | null;
};

export type PastExperience = {
  season: string;
  club: string;
  sport: string;
  category: string;
  organizationId: string;
  categoryId: string;
  role: string;
  primarySport?: {
    sportId: string | null;
    disciplineId: string | null;
    variantId: string | null;
  } | null;
};

export function getLatestAvailableSeasonStartYear(now: Date = new Date()): number {
  const year = now.getFullYear();
  const isFromJuly = now.getMonth() >= 6;
  return isFromJuly ? year : year - 1;
}

export function formatSeasonLabel(startYear: number): string {
  const suffix = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}/${suffix}`;
}

export function getSeasonOptions(now: Date = new Date()): string[] {
  const maxStartYear = getLatestAvailableSeasonStartYear(now);
  const seasons: string[] = [];
  for (let y = PAST_EXPERIENCES_START_SEASON_YEAR; y <= maxStartYear; y += 1) {
    seasons.push(formatSeasonLabel(y));
  }
  return seasons;
}

export function parseSeasonLabel(season: string): { startYear: number; endYear: number } | null {
  const match = season.trim().match(/^(\d{4})\/(\d{2})$/);
  if (!match) return null;
  const startYear = Number(match[1]);
  const suffix = Number(match[2]);
  if (!Number.isInteger(startYear) || !Number.isInteger(suffix)) return null;
  const endYear = Math.floor(startYear / 100) * 100 + suffix;
  if (endYear !== startYear + 1) return null;
  return { startYear, endYear };
}

export function sanitizePastExperience(input: PastExperienceInput): PastExperience {
  const sport = normalizeSport((input.sport || '').trim()) || (input.sport || '').trim();
  return {
    season: (input.season || '').trim(),
    club: (input.club || '').trim(),
    sport,
    category: (input.category || '').trim(),
    organizationId: (input.organizationId || '').trim(),
    categoryId: (input.categoryId || '').trim(),
    role: (input.role || '').trim(),
    primarySport: input.primarySport?.sportId
      ? {
          sportId: input.primarySport.sportId,
          disciplineId: input.primarySport.disciplineId || null,
          variantId: input.primarySport.variantId || null,
        }
      : null,
  };
}

export function isPastExperienceEmpty(experience: PastExperience): boolean {
  return !experience.season && !experience.club && !experience.sport && !experience.organizationId && !experience.categoryId && !experience.role;
}

export function isPastExperienceComplete(experience: PastExperience): boolean {
  return !!experience.season && !!experience.club && !!experience.sport
    && !!experience.organizationId && !!experience.categoryId && !!experience.role;
}
