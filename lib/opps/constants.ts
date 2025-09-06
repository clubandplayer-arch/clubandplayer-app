// lib/opps/constants.ts

export const ITALY_REGIONS = [
  'Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna','Friuli-Venezia Giulia',
  'Lazio','Liguria','Lombardia','Marche','Molise','Piemonte','Puglia','Sardegna',
  'Sicilia','Toscana','Trentino-Alto Adige/Südtirol','Umbria','Valle d\'Aosta/Vallée d\'Aoste','Veneto'
];

// Piccola lista paesi comuni; "Altro" abilita input libero
export const COUNTRIES = [
  { code: 'IT', label: 'Italia' },
  { code: 'ES', label: 'Spagna' },
  { code: 'FR', label: 'Francia' },
  { code: 'DE', label: 'Germania' },
  { code: 'GB', label: 'Regno Unito' },
  { code: 'PT', label: 'Portogallo' },
  { code: 'NL', label: 'Paesi Bassi' },
  { code: 'BE', label: 'Belgio' },
  { code: 'CH', label: 'Svizzera' },
  { code: 'US', label: 'USA' },
  { code: 'BR', label: 'Brasile' },
  { code: 'AR', label: 'Argentina' },
  { code: 'OTHER', label: 'Altro…' },
];

export const AGE_BRACKETS = ['17-20','21-25','26-30','31+'] as const;
export type AgeBracket = typeof AGE_BRACKETS[number];

export const SPORTS_ROLES: Record<string, string[]> = {
  // Calcio
  Calcio: [
    'Portiere',
    'Difensore centrale',
    'Terzino/Esterno difensivo',
    'Mediano',
    'Centrocampista centrale',
    'Trequartista',
    'Esterno offensivo/Ala',
    'Seconda punta',
    'Punta centrale',
  ],
  // Futsal
  Futsal: ['Portiere', 'Fixo', 'Ala', 'Pivot', 'Universale'],
  // Volley
  Volley: ['Palleggiatore', 'Opposto', 'Schiacciatore', 'Centrale', 'Libero'],
  // Basket
  Basket: ['Playmaker (PG)', 'Guardia (SG)', 'Ala piccola (SF)', 'Ala grande (PF)', 'Centro (C)'],
  // Pallanuoto
  Pallanuoto: ['Portiere', 'Centroboa', 'Marcatore (Hole-D)', 'Driver/Perimetrale', 'Ala', 'Punto/Regista'],
  // Pallamano
  Pallamano: ['Portiere', 'Ala sinistra', 'Terzino sinistro', 'Centrale', 'Terzino destro', 'Ala destra', 'Pivot'],
  // Rugby (Union)
  Rugby: ['Pilone', 'Tallonatore', 'Seconda linea', 'Flanker', 'Numero 8', 'Mediano di mischia', 'Apertura', 'Centro', 'Ala', 'Estremo'],
  // Hockey prato
  'Hockey su prato': ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante'],
  // Hockey ghiaccio
  'Hockey su ghiaccio': ['Portiere', 'Difensore', 'Ala sinistra', 'Centro', 'Ala destra'],
  // Baseball/Softball
  Baseball: ['Pitcher', 'Catcher', 'Prima base', 'Seconda base', 'Terza base', 'Interbase', 'Esterno sinistro', 'Esterno centro', 'Esterno destro', 'Battitore designato'],
  Softball: ['Pitcher', 'Catcher', 'Prima base', 'Seconda base', 'Terza base', 'Interbase', 'Esterno sinistro', 'Esterno centro', 'Esterno destro'],
  Lacrosse: ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante', 'LSM', 'Faceoff specialist'],
  'Football americano': ['Quarterback', 'Running back', 'Wide receiver', 'Tight end', 'Offensive lineman', 'Defensive lineman', 'Linebacker', 'Cornerback', 'Safety', 'Kicker/Punter'],
};

export const SPORTS = Object.keys(SPORTS_ROLES);
