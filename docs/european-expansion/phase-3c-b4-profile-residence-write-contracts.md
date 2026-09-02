# FASE 3C-B4.2 — Profile residence write contracts

## Stato e scope

**COMPLETATO — CONTRATTI PURI E TEST DETERMINISTICI; NESSUNA UI O PERSISTENZA COLLEGATA.**

Questo step implementa soltanto il contratto locale per pianificare il futuro dual-write Player/Athlete e Staff. Non esegue query, RPC o scritture; non modifica form, selector, migration, RLS, schema o dati Supabase. Club, Institution e Fan restano esclusi.

## Decisioni applicate

- ambiente `POTENTIALLY PRODUCTION — WRITES FORBIDDEN WITHOUT EXPLICIT APPROVAL`;
- RPC transazionale additiva approvata come strategia futura, non creata né applicata in B4.2;
- country-only valida;
- canonical autoritativa;
- mapping Italia 1:1 obbligatorio;
- proiezione testuale estera temporanea;
- nessun uso o write di interests, nationality, birth country o relocation;
- nessun default implicito a IT.

## Contratto geography opzionale

`parseResidencePatch` in `lib/geo/profileResidenceWriteContract.ts` produce quattro stati discriminati:

| Input | Stato | Significato |
| --- | --- | --- |
| proprietà `geography` assente | `absent` | non modificare residence |
| country `null`, area `null` espliciti | `reset` | azzerare residence canonicale e legacy residence |
| country UUID, area `null` | `country_only` | salvare soltanto la country canonicale |
| country UUID, area UUID | `full` | salvare residence canonicale completa |

Un oggetto parziale, un UUID invalido o una area senza country vengono rifiutati prima di produrre un piano.

## Validazione contestuale

`buildResidenceDualWritePlan` richiede una country esistente, supported e active. Per una residence completa richiede area esistente, ID corrispondente, stessa country per ogni elemento della catena e parentage coerente. Country-only non accetta accidentalmente una catena area.

Il contratto restituisce solo un piano deterministico per:

- `profile_preferences.residence_country_id`;
- `profile_preferences.residence_geo_area_id`;
- `profiles.region`, `province`, `city` come fallback temporaneo;
- `profiles.residence_region_id`, `residence_province_id`, `residence_municipality_id` come compatibilità Italia.

Non restituisce `interest_*`, `birth_country`, nationality o `open_to_relocation`.

## Italia canonical → legacy

Per IT ogni livello presente nella catena deve avere esattamente un mapping compatibile:

| Canonical | Mapping legacy | Destinazione |
| --- | --- | --- |
| REGION | `region` | `region`, `residence_region_id` |
| PROVINCE | `province` | `province`, `residence_province_id` |
| MUNICIPALITY | `municipality` | `city`, `residence_municipality_id` |

Mapping assente, duplicato/ambiguo o con ID numerico non valido produce un errore e nessun piano. Gli ID legacy del client non fanno parte del contratto.

## Proiezione estera

| Paese | `region` | `province` | `city` |
| --- | --- | --- | --- |
| FR | REGION | DEPARTMENT | COMMUNE |
| ES | AUTONOMOUS_COMMUNITY | PROVINCE | MUNICIPALITY |
| CH con District | CANTON | DISTRICT | MUNICIPALITY |
| CH senza District | CANTON | `null` | MUNICIPALITY |
| SI | STATISTICAL_REGION | `null` | MUNICIPALITY |
| PL | VOIVODESHIP | POWIAT | GMINA |

Per ogni Paese estero i tre ID residence italiani vengono esplicitamente azzerati. La proiezione testuale è fallback compatibile e non sostituisce i due riferimenti canonicali.

## PATCH parziali

È stato rimosso da `/api/profiles/me` il default implicito che impostava `interest_country = 'IT'` quando il campo non era presente. Un campo assente resta non modificato; un valore esplicito continua a seguire la normalizzazione esistente. Questo cambiamento non collega ancora il nuovo contratto geography all'endpoint.

## Test deterministici

`tests/unit/profile-residence-write-contract.test.ts` copre:

- absent/reset/country-only/full;
- oggetti parziali e UUID invalidi;
- country supported/active;
- area inesistente, mismatch country e gerarchia incoerente;
- mapping Italia completo, mancante e ambiguo;
- FR, ES, SI, PL;
- CH con e senza District;
- azzeramento legacy ID italiani all'estero;
- nessun interest/birth/nationality/relocation;
- assenza del default implicito IT nel PATCH.

Le fixture non effettuano accesso a Supabase e non contengono dati personali.

## Limiti e next step

Il contratto puro B4.2 non esegue direttamente alcun write. La successiva B4.3 ha aggiunto repository wrapper, reverse mapping canonical→legacy e RPC transazionale; il runtime PostgreSQL locale è passato, mentre la certificazione sullo stack Supabase isolato resta bloccata. Mancano inoltre integrazione endpoint, UI Player/Staff e read-after-write reale. B4 non è completata.

Il successivo **B4.3 — transactional server write** ha implementazione e revisione statica completate: migration e wrapper sono documentati in `docs/european-expansion/phase-3c-b4-transactional-profile-residence-rpc.md`. La migration è stata eseguita soltanto nel banco prova PostgreSQL temporaneo locale ed è ancora non applicata a qualsiasi ambiente remoto. Il runtime mirato locale è **PASSED**; la certificazione Supabase è **BLOCKED — ISOLATED SUPABASE ENVIRONMENT NOT AVAILABLE**. Il prossimo passo sicuro è predisporre un Supabase Branch/Staging separato. B4.4 resta **NOT STARTED** e non deve iniziare prima del superamento del gate o di una nuova decisione esplicita.
