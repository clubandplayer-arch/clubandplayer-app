# Audit tecnico Web → Mobile: Registry / Claim nazionale (Club&Player)

Data audit: 2026-05-25 (UTC)

## 1) Cronologia branch/PR e cosa hanno introdotto

### Fase 1 — Prima implementazione claim
- `#461 Feature/registry figc import`: introdotti search, claims API e pagina claim club.
- `#465-#471`: introdotte pagina admin claims + API admin list/approve/reject + fix operativi.
- `#473-#474`: stato claim riflesso su profilo Club e fix ownership states.

### Fase 2 — Registry nazionale V2 (master)
- `#484 Feature/registry master v2`: migrazione a `registry_clubs_master` e `registry_master_id`, script import, aggiornamento API/UI/admin.

### Fase 3 — Dispute claim
- `#475`: introdotte API dispute (`/api/registry/claim-disputes`, `/api/admin/registry/claim-disputes`) e UI admin.
- `#476-#480`: fix reviewer, notifiche decisioni dispute, transfer ownership quando accepted, deep link notifiche.
- `#486-#490`: completamento supporto dispute su `registry_master_id` + fix typing/admin list.

### Fase 4 — Fix master_id
- `#487`, `#488`, `#489`, `#490`: allineamento completo del flusso dispute e admin a `registry_master_id` (testuale `reg_...`) evitando mismatch con UUID.

### Fase 5 — Rimozione riferimenti CONI in UI
- `#491`: replace etichette utente verso “Registro Nazionale/ID Nazionale” in endpoint/notification/public profile.
- Nota: rimangono occorrenze “CONI” nei dataset import storici (non UI pubblica runtime).

### Fase 6 — Profilo Club
- `#485`: ripristino card “Registro Nazionale” sul profilo Club dashboard.
- `#482`: card pubblica profilo club dietro flag `NEXT_PUBLIC_ENABLE_REGISTRY_CLAIM`.

---

## 2) File creati/modificati (ambito richiesto)

**Creati (nella timeline):**
- `supabase/migrations/202605240001_registry_master_v2.sql`
- `supabase/migrations/202605240002_registry_claims_master_id.sql`
- `scripts/import-registry-master-v2.mjs`
- `app/api/registry/claim-disputes/route.ts`
- `app/api/admin/registry/claim-disputes/route.ts`
- (storico fase 1) `app/api/registry/clubs/search/route.ts`, `app/api/registry/claims/route.ts`, `app/club/registry-claim/page.tsx`, `app/admin/registry/claims/page.tsx`, `app/api/admin/registry/claims/route.ts`, `.../approve/route.ts`, `.../reject/route.ts`

**Aggiornati (più fasi):**
- tutti gli endpoint sopra + `app/(dashboard)/club/profile/page.tsx`, `app/(dashboard)/clubs/[id]/page.tsx`, `components/notifications/NotificationItem.tsx`.

---

## 3) Spiegazione file per file (essenziale)

- `...registry_master_v2.sql`: crea tabella master nazionale con `master_id`, geografia, sport normalizzati, claim ownership (`is_claimed`, `claimed_profile_id`), indici, trigger updated_at, RLS read-only pubblico safe.
- `...registry_claims_master_id.sql`: aggiunge `registry_master_id` su `registry_claims` + indice e unique per (`registry_master_id`,`profile_id`).
- `import-registry-master-v2.mjs`: importa CSV master in chunk via upsert su `master_id`.
- `GET /api/registry/clubs/search`: cerca in `registry_clubs_master`, calcola stato UI (`claimed`, `claim_pending`, `not_claimed`) e ritorna discipline mappate.
- `POST /api/registry/claims`: richiede bearer token, verifica utente+profilo `club`, accetta `registry_master_id`, crea claim `pending`, blocca club già claimed.
- `POST /api/registry/claim-disputes`: consente contestazione claim esistente (motivazione), con controllo anti-duplicati pendenti.
- `GET/PATCH /api/admin/registry/claim-disputes`: listing admin e decisione (accepted/rejected), con transfer ownership su accepted e notifiche a reclamante + owner precedente.
- `GET /api/admin/registry/claims`: lista claims admin con join logico su master data.
- `POST /api/admin/registry/claims/[id]/approve`: approva claim, richiede `registry_master_id`, marca club master come claimed e collega profile.
- `POST /api/admin/registry/claims/[id]/reject`: rifiuta claim.
- `app/club/registry-claim/page.tsx`: UX “Rivendica la tua società”, ricerca, CTA claim/dispute, box stato (in corso/claimed ecc).
- `app/admin/registry/claims/page.tsx`: console admin claims + pannello dispute.
- `app/(dashboard)/club/profile/page.tsx`: card stato Registro Nazionale lato club autenticato.
- `app/(dashboard)/clubs/[id]/page.tsx`: badge pubblico registro verificato **solo se flag abilitato**.
- `NotificationItem.tsx`: rendering testi e deep-link notifiche dispute/transfer in termini “Registro Nazionale”.

---

## 4) Schema DB essenziale
- `registry_clubs_master(master_id TEXT UNIQUE, denominazione, regione/provincia/comune, sport_normalizzati, is_claimed BOOL, claimed_profile_id UUID FK profiles)`.
- `registry_claims(..., registry_master_id TEXT NULL, registry_club_id legacy NULL, profile_id UUID, claim_status)`.
- `registry_claim_disputes(..., registry_master_id TEXT NULL, registry_club_id legacy NULL, claimant_profile_id UUID, current_claimed_by_profile_id UUID, status, reason, admin_notes, reviewed_at)`.

## 5) Tabelle/colonne usate
- Lettura ricerca: `registry_clubs_master`.
- Creazione claim: `registry_claims`.
- Stato ownership: `registry_clubs_master.is_claimed`, `.claimed_profile_id`.
- Dispute: `registry_claim_disputes`.
- Ruolo utente: `profiles.account_type|type`.
- Notifiche: `notifications` (via API admin dispute).

---

## 6) Endpoint disponibili (riuso mobile)
- User:
  - `GET /api/registry/clubs/search?q=<query>`
  - `POST /api/registry/claims`
  - `POST /api/registry/claim-disputes`
- Admin (futuro):
  - `GET /api/admin/registry/claims`
  - `POST /api/admin/registry/claims/[id]/approve`
  - `POST /api/admin/registry/claims/[id]/reject`
  - `GET/PATCH /api/admin/registry/claim-disputes`

## 7) Payload request/response (sintesi reale)
- `POST /api/registry/claims`
  - req: `{ registry_master_id }` (fallback legacy `registry_club_id` accettato nel parser)
  - res ok: `{ ok: true, claim: { id, claim_status, submitted_at, registry_master_id } }`
  - error: 401 invalid bearer, 403 non-club, 404 club non trovato, 409 già claimed.
- `POST /api/registry/claim-disputes`
  - req: `{ registry_master_id, reason }` (supporto legacy id)
  - res ok: disputa creata o duplicate guard.
- `GET /api/registry/clubs/search`
  - res: `items[]` con `registry_master_id`, nome/località, discipline, `claim_status` normalizzato.

## 8) Stati UI da replicare
- `not_claimed`
- `claim_pending` (derivato da claims `pending|in_review`)
- `pending`
- `in_review`
- `approved`
- `rejected`
- `claimed`
- dispute: `pending`, `accepted`, `rejected`

## 9) Regole privacy/dati da NON mostrare
- In UI utente evitare: riferimenti espliciti CONI/Sport e Salute, CF, rappresentante legale, `organisms`, `source_count`, `source_ids`, codici affiliazione.
- Nel dataset/migrazione esistono campi sensibili tecnici (es. `codice_fiscale`, `organisms`) ma il flusso API utente li minimizza.

## 10) Checklist parity mobile
1. Schermata claim con ricerca + risultati + stato card.
2. Claim solo per account `club`.
3. Bearer token obbligatorio come web.
4. CTA condizionali: claim / verifica in corso / club verificato / disputa.
5. Submit disputa con motivazione.
6. Gestione errori HTTP come web (401/403/404/409/500).
7. Nessuna API nuova se endpoint web esiste già.

## 11) Edge cases/rischi
- Race condition su doppio claim simultaneo vicino allo stato `is_claimed`.
- Duplicati dispute/claim mitigati ma dipendono da vincoli e query anti-duplicato.
- Flag pubblico `NEXT_PUBLIC_ENABLE_REGISTRY_CLAIM` può nascondere badge su profilo club anche se claimed.
- Residui legacy `registry_club_id` ancora presenti per backward-compat.

## 12) Sequenza micro-PR consigliate (mobile)
1. Client API layer (search/claims/disputes + bearer).
2. UI ricerca + rendering card/stati.
3. Azione claim + stato pending.
4. Flusso dispute (modal/textarea + submit).
5. Guard account type club.
6. Hardening error handling + telemetry.
7. QA parity + snapshot contenuti testuali privacy-safe.

## 13) Cosa NON replicare su mobile
- Pagine/admin workflow completo (finché non richiesto).
- Campi tecnici/sensibili del master dataset.
- Logiche legacy basate solo su `registry_club_id` senza `registry_master_id`.

## 14) Test manuali da eseguire
- Club non claimato: claim riuscito -> stato “Verifica in corso”.
- Club già claimato da me -> “Club verificato”.
- Club claimato da altri -> “Società già rivendicata” + disputa invio ok.
- Utente non-club prova claim/dispute -> 403.
- Token mancante/scaduto -> 401.
- Ricerca per query/region/province/sport e mapping discipline coerente.
- Notifiche dispute accepted/rejected e transfer con deep-link corretto.

## 15) Conclusione operativa
Il backend web è già sufficiente per parity mobile 1:1 sul flusso utente claim/dispute: riusare endpoint esistenti e replicare le stesse regole stato/permessi/privacy.

## 16) Nota sui contenuti completi file
I file sorgente sono già in repo; per handoff mobile è preferibile consumare il presente audit + riferimenti puntuali ai file originali, evitando duplicare integralmente migliaia di righe.
