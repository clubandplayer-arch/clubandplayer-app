// types/domain.ts
export type PlayingCategory = 'male' | 'female' | 'mixed';

export const TEAM_SPORTS = [
  'calcio',
  'futsal',
  'basket',
  'pallavolo',
  'pallamano',
  'rugby',
  'hockey_ghiaccio',
  'hockey_prato',
  'pallanuoto',
  'baseball',
  'softball',
  'cricket',
  'football_americano',
] as const;
export type TeamSport = (typeof TEAM_SPORTS)[number];

export const CATEGORY_LABEL: Record<PlayingCategory, string> = {
  male: 'Maschile',
  female: 'Femminile',
  mixed: 'Misto',
};
