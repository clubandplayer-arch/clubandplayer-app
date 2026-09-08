# FASE 5F-D — Collegamento runtime primary sport Profile

Data: 2026-09-08  
Stato: **IMPLEMENTATO E TESTATO NEL REPOSITORY — NON DEPLOYATO, NESSUNA WRITE REMOTA**

## Perimetro

Il solo `PATCH /api/profiles/me` usa ora la foundation 5E per il primary sport. Non sono state modificate UI, selector, Competition, migration, seed, import o backfill. La 5F-A era già applicata e registrata in Production e non è stata rieseguita; Preview resta non verificato. 5D-C resta pendente e 5D-E-I aperta/non iniziata.

## Contratto request

- campo `sport` assente e `primarySport` assente: nessuna modifica al gruppo;
- client legacy con il solo `sport`: mapping esatto/univoco quando disponibile; raw non risolvibile conservato e ID canonicali azzerati;
- `sport: null` o stringa vuota: reset legacy esplicito e compatibile dell'intero gruppo;
- `primarySport: { reset: true }`: reset additivo esplicito;
- `primarySport: { canonical: { sportId, disciplineId?, variantId? } }`: catena canonicale attiva e coerente;
- `sport` e `primarySport` insieme: `conflicting_input` HTTP 400;
- payload malformed: `invalid_input` HTTP 400; riferimento mancante/inattivo/incoerente: `invalid_reference` HTTP 400.

Gli errori inattesi del repository o della mutation sono `profile_primary_sport_write_failed` HTTP 500 e non espongono dettagli interni.

## Atomicità e autorizzazione

Il planner viene eseguito prima della mutation e la proiezione completa `sport`, `sport_id`, `sport_discipline_id`, `sport_variant_id` confluisce nello stesso oggetto `updates`. La route mantiene una sola `UPDATE ... WHERE user_id = user.id`; il fallback per una riga assente mantiene un solo UPSERT sullo stesso `user_id`. FK e shape check sono il guard finale e PostgreSQL rollbacka l'intera statement su errore.

La route resta protetta da `withAuth`; l'UPDATE è filtrato sul `user.id` autenticato e la fixture PostgreSQL verifica la policy owner-only. Nessuna write separata può lasciare un legacy value disallineato dagli ID canonicali.

## Fixture dei nove trigger

La fixture locale versionata conteneva quattro trigger con implementazioni repository. Per coprire l'inventario Production sono aggiunti cinque trigger con gli stessi nomi mancanti, ma con function body semantici minimali. Il test dimostra coesistenza, abilitazione e atomicità con nove trigger; **non dimostra che i cinque body stub siano identici alle definizioni Production**. L'identità reale dei nove trigger resta quella verificata dal post-check 5F-C.

## Limiti e prossimo controllo

Non è stato eseguito deploy né traffico Preview/Production. La UI corrente continua a inviare soltanto `sport`; il payload additivo `primarySport` non è ancora esposto da un selector. Non sono stati testati i cinque function body Production reali tramite una write remota.

**Prossimo unico controllo concreto:** review del diff della route e del contratto request/errori, quindi autorizzazione separata a un deploy/canary non mutativo o a una prova controllata; nessuna prova remota è inclusa in 5F-D.
