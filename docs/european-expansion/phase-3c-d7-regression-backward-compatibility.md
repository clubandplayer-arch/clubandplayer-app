# FASE 3C-D7 — Regressione e backward compatibility

## Stato

**COMPLETATA / PASS — test automatici e smoke finale Preview conclusi il 2026-09-01.** La FASE 3C-D è chiusa nel perimetro repository web/API.

## Matrice automatica

- Launch countries IT, FR, ES, CH, SI e PL: alias ISO2, nome ufficiale e nome localizzato mantengono ranking canonical country; un candidato legacy senza geografia non viene escluso.
- Account type Institution, Club, Player e Staff restano disponibili in Discover.
- Entrambi gli endpoint applicano lo stesso boundary di visibility pubblica (`active` + `published`), self/already-followed exclusions e pool limitati.
- WhoToFollow non include più profili pending, null-status o non pubblicati nel pool alternativo.
- Scouting country/area resta validato fail-closed, same-country e bounded senza materializzare descendants.
- Preference tables restano viewer-only tramite RLS; nessun service role e nessun interesse del target viene usato come location.
- Copy D6 presente in IT/EN/FR/ES; reason private, score e priority non raggiungono la UI.

## Performance e compatibilità

Le query mantengono limiti espliciti, un solo caricamento delle preferenze viewer e proiezioni area bounded. Nessuna nuova query per singola card. I conteggi diagnostici restano solo-debug e best-effort. Profili legacy, assenza di `profile_preferences` e assenza di canonical interests restano input validi senza penalità o default Italia.

## Perimetro

Nessuna migration, write, backfill, modifica RLS/grant, service role, Maps, mobile o file binario. D7 allinea soltanto il visibility boundary dell'endpoint WhoToFollow alternativo al boundary pubblico già usato da Search e Discover.

## Esito smoke finale Preview

- `/api/follows/suggestions?limit=5&debug=1&geoScope=country` ha risposto HTTP 200 in esecuzioni ripetute con gli stessi cinque ID nello stesso ordine, `rankingVersion=d5-v1`, nessun self/already-followed e nessun `500`/`UNKNOWN`.
- `/api/suggestions/who-to-follow?limit=5&debug=1` ha risposto HTTP 200 in esecuzioni ripetute con gli stessi cinque ID nello stesso ordine e con le esclusioni self/already-followed confermate nel debug.
- Il pool alternativo mostra `421` profili pubblici visibili e `414` eleggibili dopo le esclusioni: il calo rispetto al conteggio precedente è coerente con il boundary `active + published`, non con una perdita di compatibilità.
- Il viewer verificato è legacy (`hasCanonicalGeographyInterests=false`, `openToRelocation=false`, scouting ID null): l'assenza di preferenze canoniche resta un input valido e non produce errori o default Italia impliciti.
- Lo smoke D6 già concluso ha riconfermato `/discover`, card, avatar, link e Follow. La matrice automatica D7 completa la copertura per IT, FR, ES, CH, SI e PL, account type, canonical-interest e relocation non disponibili nel viewer manuale.

## Next gate

**FASE 3C-D completata.** La prossima azione sicura è FASE 3C-E1, audit repository-only di Maps; Maps resta non avviata finché non viene autorizzata separatamente.
