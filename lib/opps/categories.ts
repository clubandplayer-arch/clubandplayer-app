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
    'CSI',
    'ELITE',
    'Amatoriale',
  ],
  Futsal: ['Serie A', 'A2', 'B', 'C1', 'C2', 'Giovanili', 'Amatoriale', 'Altro'],
  Volley: ['SuperLega', 'A2', 'A3', 'B', 'C', 'D', 'Giovanili', 'Amatoriale', 'Amatoriale Misto'],
  Pallavolo: ['SuperLega', 'A2', 'A3', 'B', 'C', 'D', 'Giovanili', 'Amatoriale', 'Amatoriale Misto'],
  Basket: ['Serie A', 'A2', 'B', 'C Gold', 'C Silver', 'D', 'Giovanili', 'Amatoriale', 'Altro'],
  Pallanuoto: ['Serie A1', 'A2', 'B', 'C', 'Giovanili', 'Amatoriale', 'Altro'],
  Pallamano: ['Serie A Gold', 'A Silver', 'B', 'A2 Femminile', 'Giovanili', 'Amatoriale', 'Altro'],
  Rugby: ['Top10', 'Serie A', 'Serie B', 'Serie C', 'Giovanili', 'Amatoriale', 'Altro'],
  'Hockey su prato': ['Serie A1', 'A2', 'Serie B', 'Giovanili', 'Amatoriale', 'Altro'],
  'Hockey su ghiaccio': [
    'Serie A',
    'Italian Hockey League',
    'IHL - Division I',
    'U19',
    'Amatoriale',
    'Altro',
  ],
  Baseball: ['Serie A', 'Serie B', 'Serie C', 'Giovanili', 'Amatoriale', 'Altro'],
  Softball: ['Serie A1', 'Serie A2', 'Serie B', 'Giovanili', 'Amatoriale', 'Altro'],
  Lacrosse: ['Serie A', 'Serie B', 'Giovanili', 'Amatoriale', 'Altro'],
  'Football americano': [
    'Prima Divisione',
    'Seconda Divisione',
    'Terza Divisione',
    'College',
    'Giovanili',
    'Amatoriale',
    'Altro',
  ],
};
