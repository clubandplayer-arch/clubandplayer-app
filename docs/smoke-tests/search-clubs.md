# Smoke test `/search/club`

Questa checklist copre la ricerca club (UI + API) con i filtri geografici e la paginazione server.

## Prerequisiti
- Utente autenticato (qualsiasi ruolo) per accedere alle API protette.
- Database con almeno 5–10 club con combinazioni diverse di città/provincia/regione/paese.
- Indici `pg_trgm` su `name`/`display_name` e `idx_clubs_created_at` attivi (già previsti dalle migrazioni).

## Passi
1. Apri `/search/club` e verifica il caricamento iniziale senza errori (Network -> `GET /api/clubs?page=1&pageSize=20`).
2. Inserisci un nome parziale nel campo "Cerca per nome" e clicca **Filtra**: la risposta deve essere paginata e coerente con `q=`.
3. Applica un filtro geo per **Città**, **Provincia**, **Regione** e **Paese** (uno per volta) e conferma che la query API includa il relativo parametro e che i risultati corrispondano.
4. Prova combinazioni di filtri (es. `q=asd`, `city=Catania`, `region=Sicilia`) e verifica che la risposta resti <300ms su dataset normale.
5. Usa i pulsanti **Pagina precedente/successiva** per navigare i risultati: controlla che `page` cambi e che `total/pageCount` riflettano il conteggio server.
6. Apri il profilo da una card (link `/c/[id]`) e verifica che i dati siano coerenti con quanto mostrato nella lista.

## Note rapide
- La UI usa `/api/clubs` con `order=created_at desc` per sfruttare `idx_clubs_created_at` e `ilike` su nome/display_name/città per gli indici `pg_trgm`.
- Errori API devono comparire come banner rosso nella pagina; in caso di 401/403 controlla la sessione Supabase.
