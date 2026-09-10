# Web → Mobile parity roadmap

## Scopo

Questo documento è il registro permanente per trasferire al prodotto Mobile le fasi
funzionali concluse e certificate sul Web. La parity non significa copiare componenti
Next.js in React Native: significa replicare contratti API, regole di dominio,
autorizzazioni, fallback, localizzazione e risultato osservabile con una UX nativa.

Una fase Web completata deve produrre un handoff Mobile prima del merge finale quando
introduce o modifica comportamenti consumabili dal client. L'handoff è documentazione:
non autorizza automaticamente modifiche al repository Mobile e non certifica la parity.

## Stato delle baseline

| Baseline Web | Stato Web | Handoff Mobile | Implementazione Mobile | Certificazione Android/iOS |
| --- | --- | --- | --- | --- |
| FASI 1–4 | Completate secondo roadmap Web | Da consolidare dagli audit esistenti | User-reported, da riverificare | Non certificata qui |
| FASE 5 — canonical sports | Completata 5A–5J | **READY** — `phase-5-mobile-parity-handoff.md` | NOT STARTED | NOT STARTED |
| FASI 6–8 | NOT STARTED | Non applicabile | NOT STARTED | NOT STARTED |
| FASE 9 | Piano Mobile master | Questo documento | NOT STARTED | NOT STARTED |

## Procedura obbligatoria per ogni futura fase Web

### 1. Audit prima delle modifiche

Inventariare nel Web:

- route e schermate coinvolte;
- endpoint, metodi, autenticazione e status code;
- request/response realmente prodotti dal client;
- tabelle/colonne soltanto quando fanno parte del contratto osservabile;
- controlled vocabulary, traduzioni e fallback;
- loading, empty, error, retry, offline e stale-data behavior;
- ownership, RLS e separazione dei tipi account;
- deep link, caching, paginazione e limiti;
- evidenze Production e regressioni già note.

### 2. Handoff versionato

Creare `docs/mobile-parity/phase-<N>-<scope>-handoff.md` con:

1. SHA/release Web di riferimento;
2. fonti Web ordinate per autorità;
3. contratti API completi e payload di esempio anonimizzati;
4. matrice feature/account type;
5. requisiti UX Android/iOS;
6. casi legacy e canonical/new-client;
7. sicurezza, privacy e performance;
8. test funzionali e teardown;
9. criteri PASS/STOP;
10. debiti esplicitamente fuori scope.

### 3. Implementazione Mobile

Nel repository Mobile:

- eseguire prima un audit del codice esistente;
- riusare gli endpoint Web/API, senza accesso diretto privilegiato al database;
- creare adapter e componenti nativi, non copiare meccanicamente codice Web;
- mantenere backward compatibility finché tutti i client pubblicati sono migrati;
- non rendere obbligatori campi canonici che il server mantiene nullable;
- non introdurre migration, seed o cambi RLS dal client Mobile;
- mantenere una checklist con stato `NOT STARTED`, `IN PROGRESS`, `PASS` o `BLOCKED`.

### 4. Certificazione funzionale

Build, lint, typecheck e unit test sono necessari ma non sufficienti. Servono inoltre:

- test reale Android;
- test reale iOS;
- verifica Network dei payload costruiti dalla UI;
- save/read-after-write e teardown dei dati disposable;
- sessione scaduta, offline/retry e riapertura app;
- account type e permessi;
- quattro lingue attive;
- confronto affiancato con la baseline Web.

### 5. Chiusura parity

Una feature può essere marcata `PARITY PASS` solo quando:

- ogni riga della matrice funzionale ha evidenza Android e iOS;
- nessun requisito critico è `BLOCKED` o verificato soltanto tramite chiamata API;
- i payload UI rispettano il contratto Web;
- non sono emerse regressioni sui dati legacy;
- release Web e Mobile testate sono registrate;
- il teardown dei dati di prova è completato.

Il marker standard è:

```text
MOBILE_PARITY_PHASE_<N>_PASS
web_release=<sha> mobile_release=<sha-or-build>
android=pass ios=pass api_contract=pass legacy=pass security=pass teardown=pass
```

## Regola della parity 100%

“100% parity” indica copertura completa della matrice concordata, non identità grafica
pixel-perfect né identità della tecnologia. Funzioni Web deliberatamente non adatte al
Mobile devono avere una decisione approvata e un comportamento Mobile equivalente;
non possono essere silently omitted.

Il registro master rimane aperto fino alla certificazione FASE 9K. Ogni nuovo handoff
aggiorna la tabella delle baseline, senza riscrivere la storia delle fasi concluse.
