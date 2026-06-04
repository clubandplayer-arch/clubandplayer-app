// lib/opps/categories.ts

import { SPORTS } from './constants';

export const DEFAULT_CLUB_CATEGORIES: string[] = ['Altro'];

export const CLUB_SPORT_OPTIONS = [...SPORTS];

const FEDERATION_CATEGORIES = ['CSI', 'UISP', 'CSEN', 'AICS', 'OPES', 'ASC', 'ENDAS', 'PGS', 'US ACLI'];

const VOLLEY_CATEGORIES = [
  'SuperLega',
  'A2',
  'A3',
  'B',
  'C',
  'D',
  'Amatoriale',
  ...FEDERATION_CATEGORIES,
  'Amatoriale Misto',
  'Giovanili',
];

export const CATEGORIES_BY_SPORT: Record<string, string[]> = {
  Calcio: [
    'Serie D',
    'Eccellenza',
    'Promozione',
    'Prima Categoria',
    'Seconda Categoria',
    'Terza Categoria',
    'E.I.F.A.',
    ...FEDERATION_CATEGORIES,
    'FIP',
    'ELITE',
    'Giovanili',
  ],
  'Calcio a 8': ['Serie A', 'Serie A2', 'Serie B'],
  Futsal: [
    'Serie A',
    'A2',
    'B',
    'C1',
    'C2',
    'Amatoriale',
    ...FEDERATION_CATEGORIES,
    'Giovanili',
    'Altro',
  ],
  Volley: VOLLEY_CATEGORIES,
  Pallavolo: VOLLEY_CATEGORIES,
  Basket: [
    'Serie A',
    'A2',
    'B',
    'C Gold',
    'C Silver',
    'D',
    'Amatoriale',
    ...FEDERATION_CATEGORIES,
    'Giovanili',
    'Altro',
  ],
  Pallanuoto: ['Serie A1', 'A2', 'B', 'C', 'Amatoriale', ...FEDERATION_CATEGORIES, 'Giovanili', 'Altro'],
  Pallamano: [
    'Serie A Gold',
    'A Silver',
    'B',
    'A2 Femminile',
    'Amatoriale',
    ...FEDERATION_CATEGORIES,
    'Giovanili',
    'Altro',
  ],
  Rugby: ['Top10', 'Serie A', 'Serie B', 'Serie C', 'Amatoriale', ...FEDERATION_CATEGORIES, 'Giovanili', 'Altro'],
  'Hockey su prato': ['Serie A1', 'A2', 'Serie B', 'Amatoriale', ...FEDERATION_CATEGORIES, 'Giovanili', 'Altro'],
  'Hockey su ghiaccio': [
    'Serie A',
    'Italian Hockey League',
    'IHL - Division I',
    'U19',
    'Amatoriale',
    ...FEDERATION_CATEGORIES,
    'Altro',
  ],
  Baseball: ['Serie A', 'Serie B', 'Serie C', 'Amatoriale', ...FEDERATION_CATEGORIES, 'Giovanili', 'Altro'],
  Softball: ['Serie A1', 'Serie A2', 'Serie B', 'Amatoriale', ...FEDERATION_CATEGORIES, 'Giovanili', 'Altro'],
  Lacrosse: ['Serie A', 'Serie B', 'Amatoriale', ...FEDERATION_CATEGORIES, 'Giovanili', 'Altro'],
  'Football americano': [
    'Prima Divisione',
    'Seconda Divisione',
    'Terza Divisione',
    'College',
    'Amatoriale',
    ...FEDERATION_CATEGORIES,
    'Giovanili',
    'Altro',
  ],
};
