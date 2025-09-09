// lib/opps/constants.ts
export const AGE_BRACKETS = ['17-20','21-25','26-30','31+'] as const;
export type AgeBracket = typeof AGE_BRACKETS[number];

export const SPORTS_ROLES: Record<string, string[]> = {
  Calcio: ['Portiere','Difensore centrale','Terzino/Esterno difensivo','Mediano','Centrocampista centrale','Trequartista','Esterno offensivo/Ala','Seconda punta','Punta centrale'],
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
};

export const SPORTS = Object.keys(SPORTS_ROLES);
