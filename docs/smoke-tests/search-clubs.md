# Smoke test `Ricerca su mappa`

Questa checklist copre la ricerca club/player sulla mappa (UI + API) con filtri geografici e filtri specifici.

## Prerequisiti
- Utente autenticato (qualsiasi ruolo) per accedere alle API protette.
- Database con almeno 5–10 club con combinazioni diverse di città/provincia/regione/paese.
- Indici `pg_trgm` su `name`/`display_name` e `idx_clubs_created_at` attivi (già previsti dalle migrazioni).

## Passi
1. Apri `/search-map` e verifica il caricamento iniziale senza errori (Network -> `GET /api/search/map`).
2. Disegna un poligono minimo di tre punti e lancia la ricerca: la risposta deve contenere profili posizionati nell’area selezionata.
3. Applica filtri di tipo (club/player) e sport: i risultati devono aggiornarsi coerentemente al filtro impostato.
4. Usa l’input di ricerca testuale per restringere i risultati: conferma che l’API includa `query` e che l’elenco cambi.
5. Pulisci i filtri e avvia una nuova ricerca per verificare che l’UI resetti correttamente stato e risultati.
6. Apri un profilo dalla lista (link `/c/[id]` o `/athletes/[id]`) e verifica coerenza dei dati.

## Note rapide
- La UI usa `/api/search/map` tramite il service `lib/services/search.ts` (`searchProfilesOnMap`).
- Errori API devono comparire come messaggi inline; in caso di 401/403 controlla la sessione Supabase.
