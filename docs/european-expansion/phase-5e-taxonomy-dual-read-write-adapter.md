# FASE 5E — Dual-read / dual-write e adapter server

## Checkpoint e azione operatore

> **AZIONE UTENTE ORA: NON applicare ancora 5C o 5D a Preview/Production.**
>
> Gli adapter 5E non sono collegati a route o form, quindi nessuno smoke remoto richiede ancora lo schema. Prima della prima integrazione Preview che dipenderà dalle nuove colonne verranno forniti ordine (`5C → 5D`), preflight, query post-apply e rollback. Non devi ricordarlo autonomamente.

| Voce | Stato |
| --- | --- |
| Fase / sottofase | **FASE 5E** |
| Stato | **IMPLEMENTATA E TESTATA — adapter non collegati** |
| Codice modificato | Adapter puro e catalog repository server read-only |
| Migration creata | **No nuova migration** |
| Migration 5C/5D testata | **Sì localmente; non riapplicata remotamente** |
| Migration applicata | **NON Preview/Production** |
| Production interrogata / modificata | **No / No** |
| RLS / grant / ownership / Applications | **Non modificati** |
| Web / API | Nessun caller modificato; payload invariati |
| Mobile | **NOT STARTED / NON MODIFICATO** |
| Smoke manuale | Non applicabile |

## Adapter puro

`lib/taxonomy/compatibilityAdapter.ts` espone due operazioni senza dipendenze Supabase:

- `readTaxonomyCompatibility`: canonical-first, poi mapping legacy, raw legacy ed empty;
- `planTaxonomyWrite`: costruisce patch field-aware senza persisterle.

Read con una qualsiasi reference canonicale presente non effettua fallback silenzioso: una tuple incompleta, cross-sport o non trovata restituisce `invalid_canonical`. Questo evita di mascherare corruzione con una label legacy apparentemente valida.

## Semantica write

| Input | Piano |
| --- | --- |
| campo taxonomy assente | nessuna patch |
| `canonical: null` | azzera solo le cinque reference canoniche; legacy invariato salvo patch esplicita |
| canonical tuple valida | patch completa ID + proiezione legacy controllata |
| legacy riconosciuto | conserva raw legacy e aggiunge canonical IDs mappati |
| legacy sconosciuto | conserva raw legacy, nessun ID inventato |
| ruolo Player/Staff incompatibile | errore fail-closed prima del write |

La proiezione legacy arriva dal mapping catalogo e non da una traduzione. L'adapter non chiama `.insert`, `.update`, `.upsert` o `.delete`; il caller futuro resta responsabile della transazione.

## Catalog adapter server

`lib/taxonomy/compatibilityCatalog.server.ts` usa il client Supabase del caller e query read-only. Valida:

- sport esistente;
- discipline appartenente allo sport;
- variant appartenente alla discipline;
- Player role appartenente allo sport;
- Staff role esistente e separato;
- legacy Player role disambiguato anche tramite `sport_id`.

Non usa service role e non modifica ACL. Le mapping table 5D restano authenticated-only.

## Scope intenzionalmente non collegato

Nessuna importazione dell'adapter è stata aggiunta a:

- `/api/profiles/me`;
- `/api/profiles/me/experiences`;
- Opportunity create/edit/detail/list;
- Applications;
- Search, Discover, WhoToFollow, feed o Maps;
- componenti Profile/Opportunity.

Il collegamento ai profili e alle esperienze appartiene alla 5F; Opportunities alla 5G. Questo checkpoint non cambia payload pubblici o comportamento Mobile.

## Acceptance e rischi residui

- canonical-first e invalid-canonical fail-closed coperti;
- unknown legacy preservato;
- absent/null distinti;
- Player/Staff separation coperta;
- server catalog read-only e tuple-aware;
- nessuna migration, query Production, RLS/grant, ownership o Applications modificati;
- atomicità reale non ancora implementata: servirà un boundary transazionale nella sottofase che collega i write;
- schema remoto ancora assente, quindi i caller non devono selezionare nuove colonne.

Esiti automatici: test mirati adapter/contract/seed **19/19 PASS**; suite unit completa **312/312 PASS**; lint, typecheck e `git diff --check` **PASS**. Build eseguita ma non completata per impossibilità ambientale di scaricare i font Google `Inter` e `Righteous`, senza errori del codice 5E. PostgreSQL e smoke API/UI non applicabili: nessuna migration o integrazione runtime è stata aggiunta in 5E.

## Prossimo passaggio autorizzabile

**FASE 5F — profili ed esperienze**, solo dopo autorizzazione esplicita. Prima di uno smoke Preview mutativo verrà richiesto esplicitamente di applicare 5C e 5D; fino ad allora **non applicarle**.
