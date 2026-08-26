# FASE 3C-B4.3 — Transactional profile residence RPC

## Stato

**COMPLETATO STATICAMENTE — MIGRATION CREATA MA NON APPLICATA; NESSUNA WRITE REALE.**

La migration `supabase/migrations/20261204120000_transactional_profile_residence_rpc.sql` e il wrapper `lib/geo/profileResidenceWrite.server.ts` sono presenti nel repository. Non esiste un Supabase locale isolato configurato nel workspace; pertanto sono stati eseguiti soltanto test deterministici e controlli statici SQL. Non sono state effettuate connessioni o scritture remote.

L'ambiente resta **POTENTIALLY PRODUCTION — WRITES FORBIDDEN WITHOUT EXPLICIT APPROVAL**. La migration non è stata applicata a locale, Preview o Production e non è stato eseguito alcun database push.

## Scope atomico scelto

È stata scelta l'opzione **A: transazione strettamente dedicata a tutti e soli i campi geografici residence canonicali e legacy**.

La RPC non riceve un payload profilo generico e non aggiorna l'intero profilo. La sua allowlist è limitata a:

- `profile_preferences.residence_country_id`;
- `profile_preferences.residence_geo_area_id`;
- `profiles.region`, `province`, `city` come fallback temporaneo Player/Staff;
- `profiles.residence_region_id`, `residence_province_id`, `residence_municipality_id` per compatibilità Italia.

Interests, birth country, nationality, relocation e ogni altro campo profilo sono esclusi.

## Firma e semantiche

```sql
public.update_my_profile_residence(
  p_residence_country_id uuid,
  p_residence_geo_area_id uuid
) returns jsonb
```

La firma non accetta `profile_id`, JSON arbitrario o valori legacy dal client. Il profilo viene derivato esclusivamente da `auth.uid()`.

| Semantica applicativa | Invocazione |
| --- | --- |
| `absent` | il wrapper non invoca la RPC |
| `reset` | entrambi i parametri `null` |
| `country_only` | country UUID, area `null` |
| `full IT/foreign` | country UUID e area UUID |

La RPC restituisce un risultato ristretto canonical-first con profile ID owner, source, country ID, geo-area ID e legacy residence risultante. Non restituisce un profilo completo né dati pubblici.

## Sicurezza e RLS

È stata scelta **SECURITY INVOKER** perché le policy esistenti consentono al proprietario autenticato di aggiornare il proprio `profiles` e inserire/aggiornare la propria `profile_preferences`. La funzione:

- usa `auth.uid()` e rifiuta `null`;
- seleziona il profilo esclusivamente con `profiles.user_id = auth.uid()`;
- non offre un parametro per scegliere profili altrui;
- accetta soltanto `account_type` `athlete` o `staff`;
- rifiuta Club, Institution e Fan;
- usa `search_path = ''` e nomi schema qualificati;
- è revocata a `PUBLIC` e `anon`;
- concede `EXECUTE` soltanto ad `authenticated`;
- non usa service role.

Un admin non riceve una capacità cross-profile da questa RPC: non essendo necessaria per B4 Player/Staff, la superficie rimane owner-only e minima.

## Validazione canonica

PostgreSQL/PostgREST valida i due UUID tramite la firma. La funzione verifica inoltre:

- geo-area non nulla richiede country non nulla;
- country esistente, supported e active;
- area esistente e active;
- stessa country per area e ogni ancestor;
- parent traversal fino alla root;
- ciclo e profondità massima 16;
- ancestor mancante;
- area type consentiti per la gerarchia.

## Mapping e proiezione

Per IT, ogni livello presente richiede esattamente un record `legacy_geo_area_mappings` con `source_system = 'italy_legacy'`, entity type coerente e ID numerico positivo. Mapping assente o ambiguo genera errore prima dei write.

Per FR, ES, CH, SI e PL la funzione proietta le label secondo gli area type approvati. CH funziona con o senza District. Gli ID legacy italiani partono e restano `null` per ogni country estera, reset e country-only.

## Atomicità, errori e rollback

La funzione PL/pgSQL esegue nella stessa transazione:

1. autenticazione e selezione owner/ruolo;
2. validazione country/area/ancestors/mapping;
3. update della allowlist residence in `profiles`;
4. insert/upsert di `profile_preferences`, inclusa la sua assenza iniziale;
5. costruzione del risultato canonical-first.

Non intercetta eccezioni e non effettua commit intermedi. Qualsiasi errore di validazione, RLS, update profilo o upsert preferences propaga al chiamante e fa rollback dell'intera istruzione RPC. Il wrapper propaga l'errore e non simula successo.

## Wrapper server

`writeMyProfileResidence(client, patch)`:

- restituisce `skipped` senza chiamare Supabase per `absent`;
- passa soltanto i due parametri UUID/null alla RPC;
- non passa profile ID;
- restituisce il risultato RPC tipizzato;
- rifiuta risultati malformati;
- propaga errori Supabase.

Il wrapper non è ancora collegato a `/api/profiles/me` e non è stato invocato contro alcun database.

## Precisazione `interest_country`

La rimozione del default implicito `interest_country = 'IT'` dall'endpoint `/api/profiles/me` è una modifica applicativa intenzionale:

- un PATCH senza `interest_country` non aggiunge la colonna agli aggiornamenti e conserva il valore esistente;
- un PATCH con valore esplicito continua a utilizzare allowlist e normalizzazione uppercase;
- `ProfileEditForm` contiene ancora fallback come `interestCountry || 'IT'` e può quindi inviare esplicitamente IT;
- il problema **non è risolto end-to-end** e il fallback client deve essere rimosso/verificato in B4.4.

I test di regressione coprono sia il comportamento server assente/esplicito sia la presenza documentata del debito client.

## Test e limiti

I test statici verificano firma, SECURITY INVOKER, auth/owner/ruoli, grant, UUID SQL, country/area/ancestors, mapping Italia, gerarchie estere, allowlist, upsert iniziale, assenza campi proibiti e struttura transazionale. I mock del wrapper coprono skip, parametri, read-after-write simulato ed errori attribuibili a profiles/preferences.

Non essendoci un database locale isolato configurato, non è stata verificata l'esecuzione reale del PL/pgSQL. Questo resta un gate obbligatorio prima di applicare la migration. Nessuna affermazione di “migration applicata” o “RPC verificata su database” è autorizzata.

## Stato B4 e next step

B4 resta **IN PROGRESS**. Il runtime PostgreSQL locale mirato è passato; il prossimo passo sicuro è predisporre un Supabase Branch/Staging isolato e completare la certificazione B4.3 sullo schema reale. **B4.4 — Player/Staff Profile Edit integration** resta NOT STARTED e non deve iniziare prima del superamento del gate o di una nuova decisione esplicita. Prima di applicare la migration a un ambiente remoto o di eseguire qualsiasi test manuale con write occorre una nuova approvazione esplicita.

## Runtime validation gate del 2026-08-25

**LOCAL POSTGRESQL RUNTIME: PASSED; ISOLATED SUPABASE CERTIFICATION: BLOCKED.** Il gate e i risultati sono registrati in `docs/european-expansion/phase-3c-b4-transactional-rpc-runtime-validation-gate.md`. La migration resta non applicata a Preview, Staging e Production; B4.4 non può iniziare sulla base del solo banco prova locale mirato.
