# Audit forense Web → Mobile: Registry / Claim nazionale (Club and Player)

Data audit: **2026-05-26 (UTC)**  
Target: handoff per Codex Mobile con accesso **read-only** alla repo web.

> Obiettivo: permettere alla repo mobile di replicare il comportamento web **1:1** (claim + dispute + visibilità profilo), senza introdurre API nuove dove quelle web già esistono.

---

## 1) Cronologia reale (branch/PR) e impatto funzionale

### Fase 1 — prima implementazione claim (legacy FIGC/registry_clubs)
- `#461 Feature/registry figc import`
  - crea i pilastri: ricerca club, API claim, pagina club claim.
- `#465` → `#471`
  - introduce gestione admin: lista claim + approve/reject.
- `#473` → `#474`
  - stabilizza stati ownership e riflesso claim lato profilo club.

### Fase 2 — passaggio a Registry nazionale V2 (master)
- `#484 Feature/registry master v2`
  - migrazione a `registry_clubs_master` con chiave testuale `registry_master_id` (`reg_...`).
  - update API user/admin, UI claim, script import e migrazioni DB.

### Fase 3 — introduzione dispute
- `#475 Add registry claim dispute flow`
  - API user/admin dispute + integrazione UI admin claim.
- `#476` → `#480`
  - fix reviewer, notifiche esito dispute, transfer ownership su dispute accepted.
- `#486`
  - UX claim page: stato “Società già rivendicata” + CTA disputa.

### Fase 4 — hardening master_id su dispute
- `#487`, `#488`, `#489`, `#490`
  - allineamento dispute/admin a `registry_master_id` (stop passaggio ID `reg_...` in campi UUID).

### Fase 5 — pulizia testi pubblici
- `#491 Replace CONI labels...`
  - sostituisce etichette pubbliche con “Registro Nazionale”/“ID Nazionale”.

### Fase 6 — profilo Club e badge pubblico
- `#485`
  - card Registro Nazionale ripristinata nel profilo Club dashboard.
- `#482`
  - badge pubblico `/clubs/[id]` dietro flag `NEXT_PUBLIC_ENABLE_REGISTRY_CLAIM`.

### Fase 7 — hardening finale stato claim (stato attuale)
- `#494`
  - fix ownership detection per club già claimati.
- `#495`
  - nasconde **ID Nazionale** nella pagina pubblica quando il club è claimato.
- `#496`
  - fix controlli su claim attivo (`pending|in_review`) per evitare stati UI incoerenti.
- `#497`
  - blocca claim aggiuntivi da parte dello stesso profilo dopo verifica club già completata.
- `#498`
  - allinea stato claim tra pagina pubblica club e profilo-edit (consistenza cross-view).

---

## 2) File obbligatori auditati e ruolo

### Migrazioni + import
1. `supabase/migrations/202605240001_registry_master_v2.sql`
2. `supabase/migrations/202605240002_registry_claims_master_id.sql`
3. `scripts/import-registry-master-v2.mjs`
4. `imports/registry/registry_clubs_master_geo.csv`

### API user flow
5. `app/api/registry/clubs/search/route.ts`
6. `app/api/registry/claims/route.ts`
7. `app/api/registry/claim-disputes/route.ts`

### API/admin flow
8. `app/api/admin/registry/claims/route.ts`
9. `app/api/admin/registry/claims/[id]/approve/route.ts`
10. `app/api/admin/registry/claims/[id]/reject/route.ts`
11. `app/api/admin/registry/claim-disputes/route.ts`

### UI web
12. `app/club/registry-claim/page.tsx`
13. `app/admin/registry/claims/page.tsx`
14. `app/(dashboard)/club/profile/page.tsx`
15. `app/(dashboard)/clubs/[id]/page.tsx`
16. `components/notifications/NotificationItem.tsx`

---

## 3) Comportamento reale da replicare 1:1 (mobile)

### 3.1 Ricerca club
- Endpoint: `GET /api/registry/clubs/search?q=<query>[&region=&province=&sport=]`
- Fonte: `registry_clubs_master`
- `claim_status` derivato:
  - `claimed` se `is_claimed=true`
  - `claim_pending` se esiste claim `pending|in_review`
  - `not_claimed` altrimenti
- Requisito stato attuale: stato coerente tra tutte le viste che consumano la stessa entità club (fix #498).

### 3.2 Claim “Sono io questo Club”
- Endpoint: `POST /api/registry/claims`
- Auth bearer obbligatoria.
- Vincoli server:
  1. utente autenticato,
  2. profilo esistente,
  3. `account_type/type = club`,
  4. `registry_master_id` valido,
  5. club non già `is_claimed=true`,
  6. nessun claim aggiuntivo ammesso per profilo già verificato (hardening #497),
  7. gestione corretta claim attivi (`pending|in_review`) (#496).

### 3.3 Dispute “Contesta rivendicazione”
- Endpoint: `POST /api/registry/claim-disputes`
- Trigger UX: club `claimed` da altro profilo.
- Payload: `registry_master_id`, `reason`.
- Server: valida master id, ownership corrente, anti-duplicati dispute pendenti.

### 3.4 Decisione admin dispute
- Endpoint: `PATCH /api/admin/registry/claim-disputes` (+ `GET` lista)
- `accepted`:
  - transfer ownership su `registry_clubs_master.claimed_profile_id`
  - mantiene `is_claimed=true`
  - notifica reclamante + owner precedente
- `rejected`:
  - nessun transfer
  - notifica reclamante

---

## 4) Schema DB essenziale (attuale)

### 4.1 `registry_clubs_master`
- chiave funzionale: `master_id text unique` (`reg_...`)
- dati UI: denominazione, regione, provincia, comune, sport normalizzati
- ownership: `is_claimed boolean`, `claimed_profile_id uuid`
- colonne sensibili/tecniche da non esporre: `codice_fiscale`, `organisms`, `source_count` (+ metadati sorgente)

### 4.2 `registry_claims`
- colonna moderna: `registry_master_id text`
- legacy compat: `registry_club_id` resta presente
- workflow: `claim_status` (`pending`, `in_review`, `approved`, `rejected`, ...)

### 4.3 `registry_claim_disputes`
- supporto `registry_master_id`
- legacy `registry_club_id` presente
- stato: `pending|accepted|rejected`, con `reason/admin_notes/reviewed_at`

---

## 5) Endpoint da usare su mobile (senza crearne di nuovi)

### User (obbligatori)
1. `GET /api/registry/clubs/search?q=<query>`
2. `POST /api/registry/claims`
3. `POST /api/registry/claim-disputes`

### Admin (solo se richiesto)
4. `GET /api/admin/registry/claims`
5. `POST /api/admin/registry/claims/[id]/approve`
6. `POST /api/admin/registry/claims/[id]/reject`
7. `GET /api/admin/registry/claim-disputes`
8. `PATCH /api/admin/registry/claim-disputes`

---

## 6) Mappa stati UI (web → mobile)

### 6.1 Stati card ricerca
- `not_claimed` → bottone **“Sono io questo Club”**
- `claim_pending` → box **“Verifica in corso”**
- `claimed`:
  - `claimed_by_me` → **“Club verificato”**
  - `claimed_by_other` → **“Società già rivendicata”** + CTA disputa

### 6.2 Stati claim/dispute da documentare mobile
- Claim: `pending`, `in_review`, `approved`, `rejected`, `claimed`
- Dispute: `pending`, `accepted`, `rejected`

### 6.3 Vincoli di visibilità (nuovo hardening)
- Profilo pubblico club: non mostrare ID Nazionale se il club è claimato (#495).
- Parità stato tra viste pubbliche e viste profilo/edit obbligatoria (#498).

---

## 7) Privacy & contenuti vietati in UI mobile

Non esporre mai pubblicamente:
- riferimenti CONI / Registro Sport e Salute,
- `codice_fiscale`,
- rappresentante legale,
- `organisms`, `source_count`, `source_ids`,
- codici affiliazione o metadati tecnici di deduplica/import.

Nota: eventuali stringhe storiche possono restare nei dati legacy in repo, ma non in runtime UI/API pubblica.

---

## 8) Checklist parity mobile (operativa aggiornata)

1. API client con bearer token come web.
2. Guard server/UI per account non `club`.
3. Search + mapping card (nome/località/sport/stato).
4. CTA condizionali da `claim_status` + ownership.
5. Form disputa con validazione motivazione.
6. Gestione HTTP status (`401/403/404/409/500`).
7. Testi allineati: “Registro Nazionale”, no CONI.
8. Nessuna esposizione campi sensibili.
9. Refresh stato post claim/dispute.
10. Prevenzione claim multipli profilo già verificato.
11. Coerenza stato tra public/profile/edit.
12. Regola visibilità ID Nazionale su profilo pubblico claimato.

---

## 9) Edge cases e rischi

1. Race claim simultanei sullo stesso club.
2. Doppia disputa (affidarsi a duplicate guard backend).
3. Stati ibridi legacy (`registry_club_id`) + moderni (`registry_master_id`).
4. Cache client stale vs stato ownership attuale.
5. Token scaduto (search ok, mutate 401).
6. Stato pending/in_review non uniformato tra viste (regressione coperta da #496/#498).

---

## 10) Sequenza micro-PR consigliata per Codex Mobile

### PR1 — Networking + tipi
- client endpoint search/claim/dispute
- mapping stato claim centralizzato

### PR2 — Schermata claim
- ricerca + card + stati base

### PR3 — Azione claim
- submit claim + blocchi server-side + feedback errori

### PR4 — Dispute UX
- CTA disputa + modal + submit

### PR5 — Hardening parity
- blocco claim multipli profilo verificato
- coerenza stati cross-view
- policy visibilità ID Nazionale

### PR6 — QA finale
- regressioni su stati claim/dispute + privacy

---

## 11) Cosa NON replicare su mobile

- Admin dashboard completa (se non richiesta).
- Colonne sensibili/tecniche import.
- Flussi esclusivamente legacy basati su `registry_club_id`.
- Testi pubblici CONI/Registro Sport e Salute.

---

## 12) Test manuali obbligatori (release mobile)

1. Club cerca società non claimata → claim OK → “Verifica in corso”.
2. Club già proprietario → “Club verificato”.
3. Club diverso su società claimata → disputa invio OK.
4. Player/Fan/Staff su claim/dispute → `403`.
5. Token mancante/scaduto → `401` mutate.
6. Search filtrata produce risultati coerenti.
7. Nessun campo sensibile in UI/notifiche.
8. Nessuna etichetta CONI visibile.
9. Profilo già verificato non può aprire nuovi claim.
10. Club claimato: ID Nazionale non esposto in pagina pubblica.

---

## 13) Conclusione forense

Lo stato attuale web (fino ai fix `#494 → #498`) è stabile per parity mobile 1:1 sul flusso Registry Claim/Dispute. Requisiti critici: uso rigoroso di `registry_master_id`, controllo ruolo `club`, hardening su claim attivi/multipli, coerenza stati tra viste, e rispetto integrale privacy + policy no-CONI.
