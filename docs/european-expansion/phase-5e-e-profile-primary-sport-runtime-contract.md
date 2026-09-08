# FASE 5E-E — Audit e contratto del primary sport Profile

Data: 2026-09-08  
Stato: **AUDIT E CONTRATTO REPOSITORY-ONLY COMPLETATI — COLLEGAMENTO RUNTIME NON ESEGUITO**

## 1. Perimetro e riuso

Questa fase riusa l'audit 5A, il contratto 5B e le primitive 5E-A–5E-D. È limitata al singolo attributo **primary sport** della riga `profiles`; esperienze, ruolo/posizione, category, Organization/Competition e gli altri domini non sono stati auditati di nuovo.

Non sono state modificate route, UI, migration, seed, manifest, import, backfill, Preview o Production. 5D-E-I resta aperta e non iniziata per Francia, Spagna, Svizzera, Slovenia e Polonia.

## 2. Caller runtime esistente

Il punto di salvataggio preciso è `PATCH /api/profiles/me` in `app/api/profiles/me/route.ts`:

1. `FIELDS` ammette oggi soltanto `sport` come testo;
2. il body viene convertito in `updates` con semantica field-aware: campo omesso = nessuna chiave nell'update;
3. un valore sport non vuoto passa da `normalizeSport`, che conserva la compatibility legacy esistente;
4. il salvataggio della riga esistente è un singolo `profiles.update({...updates, updated_at})` filtrato per `user_id`;
5. se la riga non esiste, il fallback è un singolo `profiles.upsert(...)` sul medesimo `user_id`.

Il client Web corrente `ProfileEditForm` invia allo stesso endpoint una stringa `sport` o `null` per Club e Player/Staff e continua a non conoscere IDs canonicali. Fan e Institution azzerano/non propongono lo sport personale secondo la logica corrente. I client esistenti restano compatibili perché il futuro context sarà additivo e i payload legacy continueranno a seguire il ramo legacy 5E-D; nessun campo canonicale diventa obbligatorio.

## 3. Contratto additivo futuro

Il request body futuro potrà aggiungere un oggetto `primarySport` con gli intent già definiti da 5E-D (`canonical`, `legacyValue`, `reset`); la presenza contemporanea del vecchio `sport` richiederà una regola esplicita di aliasing o conflitto nella fase di collegamento. In 5E-E non viene accettato alcun nuovo campo dalla route.

Il piano validato deve essere proiettato come **un solo gruppo indivisibile** di colonne della medesima riga:

| Campo DB proposto | Semantica |
| --- | --- |
| `sport` | compatibility legacy stabile, raw preservato o `null` |
| `sport_id` | FK nullable a `sports(id)` |
| `sport_discipline_id` | parte nullable della catena, non un livello implicito |
| `sport_variant_id` | nullable; non può esistere senza discipline |

`lib/taxonomy/profilePrimarySportRuntimeContract.ts` formalizza soltanto questa proiezione: `no_change` restituisce `null`, mentre ogni altro piano produce tutte e quattro le chiavi. Non effettua query né write.

## 4. Dipendenze schema mancanti

Le tabelle catalogo e le candidate key composite esistono già: 5C ha aggiunto `(sport_disciplines.id, sport_id)` e `(sport_variants.id, discipline_id)`. **La tabella `profiles` non possiede però le tre colonne canonicali**, perché 5C l'ha esclusa intenzionalmente.

Prima del collegamento servono quindi, in una migration separata e inizialmente senza backfill:

- tre colonne UUID nullable `sport_id`, `sport_discipline_id`, `sport_variant_id`;
- FK `sport_id → sports(id)`;
- FK composita `(sport_discipline_id, sport_id) → sport_disciplines(id, sport_id)`;
- FK composita `(sport_variant_id, sport_discipline_id) → sport_variants(id, discipline_id)`;
- check shape: Variant richiede Discipline; Discipline richiede Sport;
- verifica dei trigger di completezza/visibility che osservano `profiles.sport`, senza cambiarne la semantica legacy;
- grant/RLS invariati salvo prova contraria, perché la write resta owner-scoped sulla stessa riga `profiles`.

Questa dipendenza blocca l'attivazione del dual-write canonicale del primary sport, ma non blocca i client legacy o le primitive repository-only. I cataloghi Competition dei cinque Paesi non sono necessari per queste tre FK: basta la foundation Sport/Discipline/Variant già presente.

## 5. Atomicità, concorrenza ed errori

Il futuro caller deve inserire le quattro chiavi nello stesso oggetto passato a un singolo `UPDATE` o `UPSERT`; sono vietate write separate per legacy e IDs. Le FK/check database sono il guard finale contro race tra validation SELECT e mutation. L'atomicità qui è definita e testata come shape del payload, ma non è ancora dimostrata su PostgreSQL perché non esistono colonne né integrazione.

Error mapping contrattuale:

- `conflicting_input`, `invalid_input`, `invalid_reference` → HTTP 400 con code stabile;
- rate limit e auth continuano a usare i contratti esistenti 429/401;
- permission/RLS resta 403 quando applicabile;
- errore repository/database inatteso → HTTP 500 `profile_primary_sport_write_failed`, senza esporre dettagli DB;
- nessun piano e nessuna mutation su `no_change`.

## 6. Contract test e conclusione

I test verificano la proiezione completa a quattro colonne, `no_change`, legacy raw lossless, error mapping, punto di salvataggio corrente, payload Web legacy e assenza delle colonne canonicali nelle migration 1/5C. Sono statici/puri: nessun test chiama route, Supabase o database.

### Dipendenze ancora aperte

1. migration additiva delle tre colonne e dei vincoli sopra descritti;
2. test PostgreSQL locale su FK, shape, nullability, update atomico e rollback;
3. solo dopo il relativo PASS: collegamento server-side del planner al `PATCH /api/profiles/me`, mantenendo invariato il payload legacy;
4. rollout/canary, UI e selector restano fasi successive e separate.

### Prossimo passaggio minimo autorizzabile

**FASE 5F-A — migration additiva del primary sport Profile**, limitata alle tre colonne nullable e ai vincoli della catena, con test PostgreSQL locale e senza backfill, route/UI, selector, dati Competition o apply Preview/Production. È il prerequisito concreto minimo per poter poi attivare il primo dual-write in una autorizzazione separata.
