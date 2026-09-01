# FASE 3C-E5 — SearchMap decision e integrazione

## Stato

**IMPLEMENTATA — test automatici PASS; smoke Preview richiesto.** E4 è chiusa sulla base dello smoke user-reported. E5 sceglie formalmente una sola UI Maps pubblica: `/club-map`.

## Decisione

Il client storico SearchMap non viene riattivato. Duplicava loader/provider, partiva da Roma, conteneva copy hardcoded, includeva filtri Player/Opportunity incompatibili con il boundary privacy E2/E3 e conservava markup popup non sanitizzato. Evolverlo in parallelo a ClubMap avrebbe ricreato due contratti divergenti.

La decisione E5 è quindi:

- `/club-map` resta la superficie Maps internazionale, canonicale e organization-only;
- `/search-map` resta compatibile come bookmark storico, ma reindirizza a `/club-map` anziché alla ricerca testuale;
- tutte le CTA runtime note in messaggi, onboarding, navbar e feed puntano direttamente a `/club-map`;
- il client irraggiungibile `SearchMapClient`, la relativa lista e il service client privato vengono rimossi;
- `/api/search/map` e `/api/search/clubs-in-bounds` restano server endpoint protetti per compatibilità e per E6/E7, senza riattivare pin personali.

## Boundary preservati

- Nessuna migration, RLS, write remoto, service role, provider aggiuntivo, mobile o file binario.
- Player/Staff/Fan non ricevono pin precisi pubblici.
- Opportunity map non viene attivata: la sua semantica resta E6.
- ClubMap conserva selector canonicale, fallback testuale bounded per gerarchie prive di bounds, clustering ed escaping E4.

## Smoke Preview richiesto

1. Aprire direttamente `/search-map`: l'URL finale deve essere `/club-map`, non `/search`.
2. Verificare da messaggi vuoti, onboarding, navbar legale e link Trending che la CTA apra direttamente `/club-map`.
3. Verificare che `/club-map` mantenga pin, cluster, popup, selezione geografica e reset E4.
4. Verificare Network: nessun caricamento del vecchio bundle SearchMap e nessuna chiamata automatica a `/api/search/map` o `/api/search/clubs-in-bounds`.
5. Verificare che la ricerca testuale globale `/search` resti invariata.

## Next gate

**Non avviare E6.** Dopo lo smoke E5 si potrà chiudere la sottofase e richiedere autorizzazione separata per **FASE 3C-E6 — Opportunity map semantics**.
