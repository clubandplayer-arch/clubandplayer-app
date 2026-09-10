# FASE 5 — handoff Web → Mobile canonical sports

## Stato e fonte di verità

| Voce | Valore |
| --- | --- |
| Web scope | FASE 5A–5J canonical sports |
| Web status | `PHASE_5J_FINAL_CERTIFICATION_PASS` |
| Production baseline | `d69768bb2df05bb8fb7ead409cba83e806b4c76b` |
| Mobile implementation | **NOT STARTED** |
| Android certification | **NOT STARTED** |
| iOS certification | **NOT STARTED** |

Questo handoff è pronto per essere consegnato al repository Mobile dopo il merge Web.
Non afferma che Mobile abbia già parity e non richiede alcun nuovo deploy, migration,
seed, backfill o modifica RLS sul Web.

## Fonti Web autorevoli

Usare questo ordine quando documentazione e codice Mobile preesistente divergono:

1. `lib/taxonomy/canonicalSportFormPayload.ts` — payload UI canonico/legacy;
2. `app/api/sports/catalog/route.ts` — catalogo read-only;
3. `lib/search/canonicalSportFilters.ts` — filtri e fallback;
4. `app/api/profiles/me/route.ts` e `app/api/profiles/me/experiences/route.ts`;
5. `app/api/opportunities/route.ts` e `app/api/opportunities/[id]/route.ts`;
6. `app/api/search/route.ts`, `app/api/follows/suggestions/route.ts` e
   `app/api/suggestions/who-to-follow/route.ts`;
7. `components/sports/CanonicalSportFilter.tsx` — comportamento UX validato;
8. `docs/european-expansion/phase-5j-final-certification.md` — evidenze e gate.

Mobile deve replicare i comportamenti e i contratti, non importare file React/Next.js.

## 1. Catalogo e selector

### Endpoint

```http
GET /api/sports/catalog
```

La risposta `200` ha `ok: true` e quattro array:

- `sports`: `id`, `code`, `canonical_name`, `display_order`;
- `disciplines`: `id`, `sport_id`, `code`, `canonical_name`,
  `is_independently_selectable`, `display_order`;
- `variants`: `id`, `discipline_id`, `code`, `canonical_name`, `team_size`,
  `display_order`;
- `legacySports`: `legacyValue`, `sportId`, `disciplineId`, `variantId`.

### UX obbligatoria

- Mostrare **un solo menu Sport**.
- Le opzioni visibili provengono da `legacySports`, non direttamente da `sports`.
- Mantenere distinte almeno `Calcio`, `Calcio a 8` e `Futsal`.
- Discipline e Variant sono ID interni derivati: non sono menu separati.
- Cambiando Sport, azzerare ruolo/categoria non validi e ricaricare le opzioni coerenti.
- Una riga legacy con sola label deve essere idratata tramite `legacyValue`.
- Catalogo vuoto/malformato o request fallita deve mostrare errore e retry; non un menu
  apparentemente valido ma vuoto.
- Evitare una cache permanente: refresh/retry deve poter leggere cataloghi aggiornati.

## 2. Contratto payload — regola bloccante

I payload accettano **esattamente una** delle due alternative.

### Canonical/new client

```json
{
  "primarySport": {
    "canonical": {
      "sportId": "<uuid>",
      "disciplineId": "<uuid-or-null>",
      "variantId": "<uuid-or-null>"
    }
  }
}
```

### Legacy/old client

```json
{
  "sport": "Calcio"
}
```

Non inviare mai contemporaneamente `sport` e `primarySport`. Il server deve continuare
ad accettare old client, valori raw legacy e righe senza UUID; Mobile non deve rendere
gli UUID obbligatori per modificare dati storici.

## 3. Profile ed Experience

### Profile

- `GET /api/profiles/me` carica label legacy, colonne UUID e proiezione canonica.
- `PATCH /api/profiles/me` invia una sola alternativa sportiva.
- Validare i campi obbligatori sullo stato UI prima di sostituire `sport` con
  `primarySport` nel payload.
- Dopo `200`, ricaricare il Profile dal server e ricostruire lo Sport visibile.
- Club, Player/Athlete e Staff usano lo stesso contratto sportivo; Fan e account non
  sportivi non devono ricevere campi impliciti.

### Experience

- `GET /api/profiles/me/experiences` carica l'elenco owner-scoped.
- `PATCH /api/profiles/me/experiences` sostituisce atomicamente l'elenco.
- Ogni elemento Experience applica autonomamente l'alternativa canonical/legacy.
- Non inviare la label `sport` conservata nello stato UI quando l'elemento contiene
  `primarySport.canonical`.
- Un errore dell'intero array non deve produrre una sostituzione parziale.

## 4. Opportunities e Applications

- `GET /api/opportunities` supporta `sportId`, `disciplineId`, `variantId` e fallback
  `sport`; canonical e legacy devono includere anche righe storiche compatibili.
- `POST /api/opportunities` crea con payload sportivo esclusivo.
- `GET /api/opportunities/{id}` rilegge il contesto salvato.
- `PATCH /api/opportunities/{id}` modifica con la stessa regola del POST.
- `DELETE /api/opportunities/{id}` resta owner/admin scoped.
- Position e StaffRole sono mutuamente esclusivi e coerenti con `role_group`.
- Applications non duplicano il contesto sportivo: lo proiettano dall'Opportunity.
- Le schermate “mie candidature” e “candidature ricevute” devono preservare i rispettivi
  scope applicant/club.

## 5. Search, Discover e WhoToFollow

- Search accetta testo, filtri, oppure filter-only.
- Sport selezionato produce `sportId` e gli ID interni derivati; il fallback `sport`
  resta disponibile per deep link e dati italiani legacy.
- Opportunities usa lo stesso valore selector e gli stessi UUID.
- Discover e WhoToFollow preferiscono lo sport canonico del viewer e ricadono sul valore
  legacy quando gli UUID non esistono.
- Cookie session e `Authorization: Bearer <token>` sono alternative supportate dagli
  endpoint protetti; non loggare il token.
- Mantenere limit/paginazione ed evitare fetch per elemento o N+1 lato Mobile.

## 6. Controlled vocabulary e lingue

- Conservare i valori persistiti; tradurre soltanto la presentazione.
- Lingue da verificare: Italiano, English, Français, Español.
- Sport, player position, staff role, gender e messaggi di errore devono usare il locale
  attivo con fallback sicuro.
- `Presidente`/`Vicepresidente` sono graficamente corretti anche in spagnolo; verificare
  inoltre inglese (`President`, `Vice president`) e francese
  (`Président`, `Vice-président`) per rilevare fallback accidentali.

## 7. Sicurezza e performance

- Usare soltanto sessione utente; nessuna service-role key nel bundle Mobile.
- Non scrivere direttamente nelle tabelle catalogo.
- Profile/Experience restano owner-scoped; Opportunity/Application mantengono ownership
  e autorizzazioni Web.
- Non memorizzare token o payload personali nei log, analytics o screenshot di evidenza.
- Cancellare request in-flight quando la schermata viene smontata o la selezione cambia.
- Cache catalogo ammessa solo con invalidazione/retry espliciti; mai trasformare una
  risposta vecchia priva di `legacySports` in un successo vuoto.
- Liste e ricerca devono usare limiti server, debounce e rendering virtualizzato.

## 8. Matrice implementativa Mobile

| ID | Scenario | Android | iOS | Evidenza richiesta |
| --- | --- | --- | --- | --- |
| M5-01 | Catalogo e 14 opzioni applicative | NOT STARTED | NOT STARTED | Network + UI |
| M5-02 | Unico selector; Calcio/Calcio a 8/Futsal distinti | NOT STARTED | NOT STARTED | Video/screenshot |
| M5-03 | Reset ruolo/categoria cambiando Sport | NOT STARTED | NOT STARTED | UI funzionale |
| M5-04 | Search filter-only canonical + legacy results | NOT STARTED | NOT STARTED | URL/request + risultati |
| M5-05 | Opportunities filtri canonical/legacy | NOT STARTED | NOT STARTED | Request + risultati |
| M5-06 | Profile canonical save/read-after-write | NOT STARTED | NOT STARTED | Payload UI + reread |
| M5-07 | Profile legacy row edit senza perdita dati | NOT STARTED | NOT STARTED | Before/after |
| M5-08 | Experience replace atomico + reread | NOT STARTED | NOT STARTED | Payload UI + reread |
| M5-09 | Opportunity create/read/update/delete | NOT STARTED | NOT STARTED | Status + teardown |
| M5-10 | Applications applicant/club ownership | NOT STARTED | NOT STARTED | Due account disposable |
| M5-11 | Discover/WhoToFollow canonical + fallback | NOT STARTED | NOT STARTED | Risultati motivati |
| M5-12 | IT/EN/FR/ES controlled vocabulary | NOT STARTED | NOT STARTED | Quattro locale |
| M5-13 | Offline, retry, session expired, catalog error | NOT STARTED | NOT STARTED | Stati UI |
| M5-14 | Liste lunghe, keyboard, navigation, no freeze | NOT STARTED | NOT STARTED | Device test |

## 9. Sequenza consigliata nel repository Mobile

1. Auditare schermate, API client, auth, cache e modelli Mobile esistenti.
2. Scrivere test del parser catalogo e del builder payload prima della UI.
3. Implementare un adapter `CanonicalSportSelection` platform-neutral.
4. Integrare il selector in Search e Opportunities; verificare reset e fallback.
5. Integrare Profile ed Experience con payload acquisiti dalla UI reale.
6. Integrare Opportunity e verificare Applications senza duplicare il contesto.
7. Integrare Discover/WhoToFollow e localizzazione.
8. Eseguire la matrice prima su Preview/staging Mobile con account disposable.
9. Eseguire Android e iOS separatamente, incluso teardown.
10. Aggiornare questo documento o copiarne la matrice nel repository Mobile con release,
    build ed evidenze.

## 10. PASS finale Mobile FASE 5

La parity è chiudibile solo con M5-01…M5-14 PASS su entrambe le piattaforme, nessun dato
disposable residuo e nessuna regressione old client.

```text
MOBILE_PARITY_PHASE_5_PASS
web_release=d69768bb2df05bb8fb7ead409cba83e806b4c76b mobile_release=<sha-or-build>
android=pass ios=pass catalog=pass selector=pass profile=pass experience=pass
opportunity=pass applications=pass search=pass suggestions=pass i18n=pass
legacy=pass security=pass performance=pass teardown=pass
```

Qualunque payload UI contenente insieme `sport` e `primarySport`, perdita di una riga
legacy, autorizzazione errata, differenza non approvata tra Android/iOS o test eseguito
soltanto tramite replay API produce `MOBILE_PARITY_PHASE_5_STOP`.
