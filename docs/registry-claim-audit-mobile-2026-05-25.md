# Audit tecnico Web → Mobile: Registry / Claim nazionale (Club&Player)

Data audit: **2026-05-25 (UTC)**  
Target: handoff per Codex Mobile con accesso **read-only** alla repo web.

> Obiettivo: permettere alla repo mobile di replicare il comportamento web **1:1**, in più PR, senza introdurre API nuove dove quelle web già esistono.

---

## 1) Cronologia reale (branch/PR) e impatto funzionale

### Fase 1 — prima implementazione claim (legacy FIGC/registry_clubs)
- `#461 Feature/registry figc import`
  - crea i pilastri: ricerca club, API claim, pagina club claim.
- `#465` → `#471`
  - introduce la gestione admin: lista claim + approve/reject.
- `#473` → `#474`
  - stabilizza stati ownership e riflesso dello stato claim lato profilo club.

### Fase 2 — passaggio a Registry nazionale V2 (master)
- `#484 Feature/registry master v2`
  - migrazione al dataset master nazionale (`registry_clubs_master`) con chiave testuale `registry_master_id` (`reg_...`).
  - aggiorna API user/admin + UI claim + script import e migrazioni DB.

### Fase 3 — introduzione dispute (contesta rivendicazione)
- `#475 Add registry claim dispute flow`
  - aggiunge API user/admin dispute e integrazione in UI admin claim.
- `#476` → `#480`
  - fix reviewer, notifiche esito dispute, trasferimento ownership se dispute accettata.
- `#486`
  - UX claim page aggiornata per mostrare “Società già rivendicata” + CTA disputa.

### Fase 4 — hardening master_id su dispute
- `#487`, `#488`, `#489`, `#490`
  - allineamento dispute/admin a `registry_master_id` per evitare passaggio di ID `reg_...` in campi UUID.

### Fase 5 — pulizia testi pubblici (no CONI in UI)
- `#491 Replace CONI labels...`
  - sostituzione etichette pubbliche con “Registro Nazionale”/“ID Nazionale” in UI/notification/API messages.

### Fase 6 — profilo Club e visibilità card
- `#485`
  - card Registro Nazionale ripristinata nel profilo Club dashboard.
- `#482`
  - badge pubblico nel profilo `/clubs/[id]` dietro flag `NEXT_PUBLIC_ENABLE_REGISTRY_CLAIM`.

---

## 2) File obbligatori auditati e ruolo

### Migrazioni + import
1. `supabase/migrations/202605240001_registry_master_v2.sql`  
   Crea tabella master nazionale, indici, trigger `updated_at`, RLS safe read-only pubblico.
2. `supabase/migrations/202605240002_registry_claims_master_id.sql`  
   Aggiunge `registry_master_id` a `registry_claims` (+ index + unique per profilo).
3. `scripts/import-registry-master-v2.mjs`  
   Import CSV in chunk (upsert su `master_id`).
4. `imports/registry/registry_clubs_master_geo.csv`  
   Dataset master sorgente (contiene anche colonne non esponibili al pubblico).

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

## 3.1 Ricerca club
- Endpoint: `GET /api/registry/clubs/search?q=<query>[&region=&province=&sport=]`
- Fonte: `registry_clubs_master`.
- Risposta item contiene almeno:
  - `registry_master_id` / `master_id`
  - nome (`name`), località (`region`,`province`,`municipality`)
  - discipline (`registry_club_disciplines`)
  - `claim_status` derivato:
    - `claimed` se `is_claimed=true`
    - `claim_pending` se esiste claim `pending|in_review`
    - `not_claimed` altrimenti

## 3.2 Claim “Sono io questo Club”
- Endpoint: `POST /api/registry/claims`
- Auth: bearer token obbligatorio.
- Vincoli server:
  1. utente autenticato valido,
  2. profilo esistente,
  3. `account_type/type` deve essere `club`,
  4. `registry_master_id` valido,
  5. club non già `is_claimed=true`.
- Inserimento claim:
  - `registry_master_id` (testuale)
  - `registry_club_id: null`
  - `claim_status: "pending"`
  - `claim_method: "self_service"`

## 3.3 Dispute “Contesta rivendicazione”
- Endpoint: `POST /api/registry/claim-disputes`
- Trigger UX: club già `claimed` da altro profilo.
- Payload richiesto: `registry_master_id`, `reason`.
- Server: valida id master, ownership corrente, anti-duplicati dispute pendenti.

## 3.4 Decisione admin dispute
- Endpoint admin: `PATCH /api/admin/registry/claim-disputes` (oltre a `GET` lista)
- Se `accepted`:
  - transfer ownership su `registry_clubs_master.claimed_profile_id`
  - mantiene `is_claimed=true`
  - notifica reclamante + precedente owner
- Se `rejected`:
  - nessun transfer
  - notifica reclamante

---

## 4) Schema DB essenziale (attuale)

### 4.1 `registry_clubs_master`
- chiave funzionale: `master_id text unique` (formato tipico `reg_...`)
- dati pubblici usati in UI: `denominazione`, `regione`, `provincia`, `comune`, `sport_normalizzati`
- ownership: `is_claimed boolean`, `claimed_profile_id uuid`
- colonne sensibili/tecniche presenti ma da non esporre: `codice_fiscale`, `organisms`, `source_count`

### 4.2 `registry_claims`
- nuova colonna: `registry_master_id text`
- legacy: `registry_club_id` ancora presente per compatibilità
- stato workflow: `claim_status` (`pending`, `in_review`, `approved`, `rejected`, ...)

### 4.3 `registry_claim_disputes`
- supporta `registry_master_id`
- legacy `registry_club_id` ancora presente
- campi stato: `status` (`pending|accepted|rejected`), `reason`, `admin_notes`, `reviewed_at`

---

## 5) Endpoint da usare su mobile (senza crearne di nuovi)

### User (obbligatori)
1. `GET /api/registry/clubs/search?q=<query>`
2. `POST /api/registry/claims`
3. `POST /api/registry/claim-disputes`

### Admin (solo se richiesto in futuro)
4. `GET /api/admin/registry/claims`
5. `POST /api/admin/registry/claims/[id]/approve`
6. `POST /api/admin/registry/claims/[id]/reject`
7. `GET /api/admin/registry/claim-disputes`
8. `PATCH /api/admin/registry/claim-disputes`

---

## 6) Payload minimi reali (ready-to-use mobile)

### 6.1 Search
`GET /api/registry/clubs/search?q=marconi`

Response (shape tipica):
```json
{
  "ok": true,
  "count": 1,
  "items": [
    {
      "registry_master_id": "reg_xxx",
      "name": "ASD ...",
      "region": "Lazio",
      "province": "RM",
      "municipality": "Roma",
      "claim_status": "not_claimed",
      "registry_club_disciplines": [
        { "clubandplayer_sport": "Calcio", "discipline_raw": "Calcio" }
      ]
    }
  ]
}
```

### 6.2 Claim
`POST /api/registry/claims`
```json
{ "registry_master_id": "reg_xxx" }
```

Response OK:
```json
{
  "ok": true,
  "claim": {
    "id": "uuid",
    "claim_status": "pending",
    "submitted_at": "...",
    "registry_master_id": "reg_xxx"
  }
}
```

Error principali:
- `401` unauthorized/invalid session
- `403` profilo non Club
- `404` società non trovata
- `409` società già rivendicata

### 6.3 Dispute
`POST /api/registry/claim-disputes`
```json
{
  "registry_master_id": "reg_xxx",
  "reason": "Testo motivazione"
}
```

Response OK: `ok: true` con record disputa creato (shape variabile), oppure risposta di duplicate guard se già pendente.

---

## 7) Mappa stati UI (web → mobile)

### 7.1 Stati card ricerca
- `not_claimed` → mostra bottone **“Sono io questo Club”**
- `claim_pending` (deriva da claim `pending|in_review`) → box **“Verifica in corso”**
- `claimed`:
  - se `claimed_by_me` → box **“Club verificato”**
  - se `claimed_by_other` → box **“Società già rivendicata”** + CTA disputa

### 7.2 Stati claim/dispute da documentare lato mobile
- Claim: `pending`, `in_review`, `approved`, `rejected`, `claimed`
- Dispute: `pending`, `accepted`, `rejected`

---

## 8) Privacy: cosa NON esporre mai in UI mobile

Non mostrare mai pubblicamente:
- riferimenti testuali a **CONI** o “Registro Sport e Salute”
- `codice_fiscale`
- rappresentante legale
- `organisms`
- `source_count`
- `source_ids`
- codice affiliazione
- qualsiasi metadato non necessario al claim UX

Nota: possono rimanere occorrenze CONI in file dati/import storici in repo web, ma non devono comparire in UI/runtime utente.

---

## 9) Flag e comportamento profilo Club

- In `app/(dashboard)/clubs/[id]/page.tsx` il rendering pubblico del badge claim è condizionato da:
  - `NEXT_PUBLIC_ENABLE_REGISTRY_CLAIM === 'true'`
- In `app/(dashboard)/club/profile/page.tsx` la card dashboard club legge lo stato reale claim su master table.

Indicazione mobile:
- replicare la logica business degli stati claim,
- **non** dipendere da flag web-only se non previsto anche in mobile env.

---

## 10) Checklist parity mobile (operativa)

1. Implementare API client con bearer token identico al web.
2. Bloccare claim/dispute per account non `club`.
3. Implementare search e mapping card (nome/località/sport/stato).
4. Implementare CTA condizionali in base a `claim_status`.
5. Implementare form disputa con validazione motivazione.
6. Gestire in UI gli HTTP status principali (`401/403/404/409/500`).
7. Mostrare testi coerenti con web (“Registro Nazionale”, no CONI).
8. Non esporre campi sensibili del master dataset.
9. Verificare transizioni stato dopo claim/dispute con refresh query.
10. Aggiungere telemetria/error logging lato mobile per mismatch stato.

---

## 11) Edge cases e rischi

1. **Race condition claim**: due club inviano claim quasi simultaneo.
2. **Doppia disputa**: utente invia più volte; affidarsi a duplicate guard backend.
3. **Stati ibridi legacy**: presenza di `registry_club_id` legacy e `registry_master_id` moderno.
4. **Mismatch claimed state**: `is_claimed` true ma lista claim non aggiornata in cache client.
5. **Token scaduto**: search può funzionare, claim/dispute no (401).

---

## 12) Sequenza micro-PR consigliata per Codex Mobile

### PR1 — Networking + tipi
- aggiunta client endpoint search/claims/disputes
- modelli dati e mapping status

### PR2 — Schermata claim base
- UI ricerca + lista card + stato not_claimed/claim_pending/claimed

### PR3 — Azione claim
- submit claim + gestione errori/feedback

### PR4 — Dispute UX
- CTA “Contesta rivendicazione” + modal/textarea + submit

### PR5 — Hardening parity
- controlli ruolo club, testi finali, privacy safe fields, logging

### PR6 — QA finale
- test manuale e fix edge cases fino a parità 1:1

---

## 13) Cosa NON replicare su mobile

- Dashboard/admin web completa (se non richiesta).
- Colonne sensibili/tecniche usate solo per import/deduplica.
- Flussi legacy basati solo su `registry_club_id` ignorando `registry_master_id`.
- Qualsiasi testo pubblico CONI/Registro Sport e Salute.

---

## 14) Test manuali obbligatori (prima release mobile)

1. Club cerca società non claimata → claim OK → stato “Verifica in corso”.
2. Club già proprietario → stato “Club verificato”.
3. Club diverso su società claimata → “Società già rivendicata” + disputa invio OK.
4. Player/Fan/Staff tenta claim/dispute → errore 403.
5. Token mancante/scaduto → 401 su endpoint protetti.
6. Search con query/region/province/sport produce risultati coerenti.
7. Nessun campo sensibile mostrato in card/dettaglio/notifiche.
8. Nessuna etichetta CONI visibile in UI notifiche comprese.

---

## 15) Conclusione

La repo web espone già il set API necessario per parity mobile 1:1 del flusso utente Registry Claim/Dispute.  
La replica corretta richiede soprattutto:
- uso rigoroso di `registry_master_id`,
- gestione fedele degli stati UI,
- rispetto permessi account type `club`,
- igiene privacy sui dati mostrati.
