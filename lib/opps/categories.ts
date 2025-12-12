// lib/opps/categories.ts

import { SPORTS } from './constants';

export const DEFAULT_CLUB_CATEGORIES: string[] = ['Altro'];

// Alcuni flussi includono "Pallavolo" come alias di Volley
export const CLUB_SPORT_OPTIONS = Array.from(new Set([...SPORTS, 'Pallavolo']));

export const CATEGORIES_BY_SPORT: Record<string, string[]> = {
  Calcio: [
    'Serie D',
    'Eccellenza',
    'Promozione',
    'Prima Categoria',
    'Seconda Categoria',
    'Terza Categoria',
    'Giovanili',
    'Altro',
  ],
  Futsal: ['Serie A', 'A2', 'B', 'C1', 'C2', 'Giovanili', 'Altro'],
  Volley: ['SuperLega', 'A2', 'A3', 'B', 'C', 'D', 'Giovanili', 'Altro'],
  Pallavolo: ['SuperLega', 'A2', 'A3', 'B', 'C', 'D', 'Giovanili', 'Altro'],
  Basket: ['Serie A', 'A2', 'B', 'C Gold', 'C Silver', 'D', 'Giovanili', 'Altro'],
  Pallanuoto: ['Serie A1', 'A2', 'B', 'C', 'Giovanili', 'Altro'],
  Pallamano: ['Serie A Gold', 'A Silver', 'B', 'A2 Femminile', 'Giovanili', 'Altro'],
  Rugby: ['Top10', 'Serie A', 'Serie B', 'Serie C', 'Giovanili', 'Altro'],
  'Hockey su prato': ['Serie A1', 'A2', 'Serie B', 'Giovanili', 'Altro'],
  'Hockey su ghiaccio': [
    'Serie A',
    'Italian Hockey League',
    'IHL - Division I',
    'U19',
    'Altro',
  ],
  Baseball: ['Serie A', 'Serie B', 'Serie C', 'Giovanili', 'Altro'],
  Softball: ['Serie A1', 'Serie A2', 'Serie B', 'Giovanili', 'Altro'],
  Lacrosse: ['Serie A', 'Serie B', 'Giovanili', 'Altro'],
  'Football americano': [
    'Prima Divisione',
    'Seconda Divisione',
    'Terza Divisione',
    'College',
    'Giovanili',
    'Altro',
  ],
};
