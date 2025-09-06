// lib/opps/geo.ts
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

// 20 regioni italiane
export const ITALY_REGIONS = [
  'Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna','Friuli-Venezia Giulia',
  'Lazio','Liguria','Lombardia','Marche','Molise','Piemonte','Puglia','Sardegna',
  'Sicilia','Toscana','Trentino-Alto Adige/Südtirol','Umbria','Valle d\'Aosta/Vallée d\'Aoste','Veneto'
] as const;

// Province note per alcune regioni (estendibile)
export const PROVINCES_BY_REGION: Record<string, string[]> = {
  Sicilia: [
    'Agrigento','Caltanissetta','Catania','Enna','Messina','Palermo','Ragusa','Siracusa','Trapani'
  ],
  // aggiungi altre regioni qui se vuoi menu a tendina anche per loro
};

// Comuni per provincia (esempio completo: Siracusa)
export const CITIES_BY_PROVINCE: Record<string, string[]> = {
  Siracusa: [
    'Augusta','Avola','Buccheri','Buscemi','Canicattini Bagni','Carlentini','Cassaro','Ferla',
    'Floridia','Francofonte','Lentini','Melilli','Noto','Pachino','Palazzolo Acreide',
    'Portopalo di Capo Passero','Priolo Gargallo','Rosolini','Siracusa','Solarino','Sortino'
  ],
  // puoi aggiungere altre province allo stesso modo
};
