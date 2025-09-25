export type SportKey = 'CALCIO' | 'FUTSAL' | 'BASKET' | 'VOLLEY';

export const sports: SportKey[] = ['CALCIO', 'FUTSAL', 'BASKET', 'VOLLEY'];

export const rolesBySport: Record<SportKey, string[]> = {
  CALCIO: [
    'Portiere',
    'Difensore centrale',
    'Terzino destro',
    'Terzino sinistro',
    'Mediano',
    'Centrocampista centrale',
    'Esterno di centrocampo',
    'Trequartista',
    'Ala destra',
    'Ala sinistra',
    'Seconda punta',
    'Attaccante (punta centrale)',
  ],
  FUTSAL: ['Portiere', 'Ultimo (difensore)', 'Laterale', 'Pivot (attaccante)', 'Universale'],
  BASKET: ['Playmaker (1)', 'Guardia (2)', 'Ala piccola (3)', 'Ala grande (4)', 'Centro (5)'],
  VOLLEY: ['Palleggiatore', 'Opposto', 'Schiacciatore (Banda)', 'Centrale', 'Libero'],
};
