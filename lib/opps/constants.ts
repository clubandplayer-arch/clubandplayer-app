// lib/opps/constants.ts
export const AGE_BRACKETS = ['17-20','21-25','26-30','31+'] as const;
export type AgeBracket = typeof AGE_BRACKETS[number];

const FOOTBALL_ROLES = ['Portiere','Difensore centrale','Terzino/Esterno difensivo','Mediano','Centrocampista centrale','Trequartista','Esterno offensivo/Ala','Seconda punta','Punta centrale'];
const CALCIO_A_8_ROLES = ['Portiere','Difensore Centrale','Esterno Basso','Regista','Esterno Alto','Punta Centrale'];
const SMALL_SIDED_FOOTBALL_ROLES = ['Portiere','Difensore','Centrocampista','Esterno offensivo/Ala','Attaccante'];
const FLOORBALL_ROLES = ['Portiere','Difensore','Centro','Ala','Attaccante'];

const SPORTS_REQUIRING_PLAYER_ROLE = new Set(['Calcio', 'Calcio a 8', 'Calcio a 7', 'Calcio a 6', 'Floorball']);

export const SPORTS_ROLES: Record<string, string[]> = {
  Calcio: FOOTBALL_ROLES,
  'Calcio a 8': CALCIO_A_8_ROLES,
  'Calcio a 7': SMALL_SIDED_FOOTBALL_ROLES,
  'Calcio a 6': SMALL_SIDED_FOOTBALL_ROLES,
  Futsal: ['Portiere','Fixo','Ala','Pivot','Universale'],
  Volley: ['Palleggiatore','Opposto','Schiacciatore','Centrale','Libero'],
  Basket: ['Playmaker (PG)','Guardia (SG)','Ala piccola (SF)','Ala grande (PF)','Centro (C)'],
  Pallanuoto: ['Portiere','Centroboa','Marcatore (Hole-D)','Driver/Perimetrale','Ala','Punto/Regista'],
  Pallamano: ['Portiere','Ala sinistra','Terzino sinistro','Centrale','Terzino destro','Ala destra','Pivot'],
  Rugby: ['Pilone','Tallonatore','Seconda linea','Flanker','Numero 8','Mediano di mischia','Apertura','Centro','Ala','Estremo'],
  'Hockey su prato': ['Portiere','Difensore','Centrocampista','Attaccante'],
  'Hockey su ghiaccio': ['Portiere','Difensore','Ala sinistra','Centro','Ala destra'],
  Baseball: ['Pitcher','Catcher','Prima base','Seconda base','Terza base','Interbase','Esterno sinistro','Esterno centro','Esterno destro','Battitore designato'],
  Softball: ['Pitcher','Catcher','Prima base','Seconda base','Terza base','Interbase','Esterno sinistro','Esterno centro','Esterno destro'],
  Lacrosse: ['Portiere','Difensore','Centrocampista','Attaccante','LSM','Faceoff specialist'],
  'Football americano': ['Quarterback','Running back','Wide receiver','Tight end','Offensive lineman','Defensive lineman','Linebacker','Cornerback','Safety','Kicker/Punter'],
  Floorball: FLOORBALL_ROLES,
};

export const SPORTS = Object.keys(SPORTS_ROLES);
export const STAFF_ROLES = [
  'Presidente',
  'Vicepresidente',
  'Direttore Sportivo',
  'Direttore Generale',
  'Segretario',
  'Team manager',
  'Dirigente Accompagnatore',
  'Allenatore',
  'Vice Allenatore',
  'Collaboratore Tecnico',
  'Match Analyst',
  'Video Analyst',
  'Preparatore Atletico',
  'Preparatore Portieri',
  'Medico Sociale',
  'Fisioterapista',
  'Osteopata',
  'Massaggiatore',
  'Mental Coach',
  'Nutrizionista',
  'Scout',
  'Talent Scout',
  'Addetto Stampa',
  'Social Media Manager',
  'Fotografo',
  'Content Creator',
] as const;

export const SPORT_ALIASES: Record<string, string> = {
  Pallavolo: 'Volley',
};

export function normalizeSport(input?: string | null): string | null {
  if (input == null) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return SPORT_ALIASES[trimmed] ?? trimmed;
}

export function sportRequiresPlayerRole(input?: string | null): boolean {
  const normalizedSport = normalizeSport(input);
  return normalizedSport ? SPORTS_REQUIRING_PLAYER_ROLE.has(normalizedSport) : false;
}
