# FASE 3C-D7 — Regressione e backward compatibility

## Stato

**IMPLEMENTATA — test automatici PASS; smoke finale Preview richiesto.** La FASE 3C-D non può essere chiusa prima della conferma manuale D7.

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

## Smoke finale Preview richiesto

1. Viewer legacy: `/discover` senza selezione e i due endpoint suggerimenti devono rispondere HTTP 200, senza self/already-followed.
2. Scouting FR + Auvergne-Rhône-Alpes: Club/Player non devono mostrare risultati fuori country/area; reload URL deve preservare la selezione.
3. Ripetere country-only con IT, FR, ES, CH, SI e PL; una lista vuota è valida, un risultato cross-country no.
4. Verificare Institution, Club, Player e Staff; sport mio/tutti; empty state; card/link/avatar/Follow.
5. Verificare che un profilo pending/draft/non pubblicato noto non compaia in `/api/suggestions/who-to-follow`.
6. Ripetere due volte entrambi gli endpoint: ordine stabile, `rankingVersion=d5-v1`, nessun 500/`UNKNOWN`.
7. Verificare Network/Console e lingue IT/EN/FR/ES.
8. Se disponibili viewer canonical-interest o relocation, riconfermare i relativi booleani; in loro assenza resta valida la copertura automatica.

## Next gate

**Non avviare FASE 3C-E Maps.** Dopo lo smoke D7 si potrà chiudere FASE 3C-D e richiedere separata autorizzazione per Maps.
