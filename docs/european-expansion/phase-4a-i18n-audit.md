# FASE 4A — Audit stringhe e locale

## Stato

**COMPLETATA — audit repository Web, nessuna modifica runtime.**

Questo checkpoint riconcilia l'implementazione già presente con le sottofasi 4A–4I. Non certifica le traduzioni, non completa la FASE 4 e non modifica il database, le API, il comportamento Web o il client Mobile.

## Perimetro e metodo

L'audit ha incluso:

- configurazione e risoluzione del locale;
- provider React e switcher lingua;
- cataloghi IT/EN/FR/ES e parità delle chiavi;
- persistenza anonima e autenticata;
- formattazione locale di date e numeri;
- inventario delle route App Router;
- stringhe UI probabilmente hardcoded;
- metadata, Open Graph e SEO;
- fallback e test automatici esistenti;
- schema `languages` e `profile_preferences` già presente.

Le ricerche delle stringhe sono euristiche: accenti o parole italiane possono apparire legittimamente in commenti, fixture, API, contenuti legali, nomi propri o normalizzazioni legacy. Il conteggio è quindi un inventario di candidati da classificare, non un conteggio di bug.

## Evidenze esistenti

### Locale e catalogo

- Le lingue attive sono IT, EN, FR ed ES; PT e DE sono catalogate ma inattive.
- La normalizzazione accetta locale regionali come `fr-CH` o `es-MX` e li riduce alla lingua supportata.
- La precedenza server è: preferenza autenticata → cookie `cp_locale` → `Accept-Language` → italiano.
- Il root layout risolve il locale sul server, carica il catalogo corrispondente e imposta `<html lang>`.
- Il provider client aggiorna catalogo e attributo `lang` senza richiedere un reload completo.

### Persistenza

- La scelta anonima è conservata in un cookie same-site per un anno.
- La scelta autenticata aggiorna soltanto `preferred_language_id`.
- Residence, interessi geografici e relocation non vengono scritti dal selettore lingua.
- Il catalogo database consente lettura pubblica delle lingue e limita le modifiche amministrative; le preferenze profilo restano owner/admin tramite RLS.

### Messaggi e fallback

- I quattro cataloghi contengono lo stesso insieme tipizzato di chiavi.
- L'italiano è la sorgente del tipo `MessageKey` e il fallback finale.
- Il runtime usa, in ordine, catalogo attivo → catalogo iniziale → chiave; l'helper esplicito di fallback usa catalogo richiesto → fallback fornito → italiano → chiave.
- Sono presenti namespace separati per completion, feed, operations, sponsor e vocabulary.

### Copertura automatica già presente

I test esistenti coprono precedenza del locale, lingue attive, cookie, isolamento della write autenticata, parità delle chiavi, fallback, interpolazione, inventario route e alcuni gruppi di stringhe precedentemente segnalate.

## Inventario quantitativo

Al momento dell'audit:

- 82 file `app/**/page.tsx`;
- 54 route classificate `USER-FACING`;
- 11 `ADMIN`;
- 7 redirect legacy;
- 4 route `LEGAL`;
- 2 `REGISTRY`;
- 2 `VERIFICATION`;
- 2 route classificate `API/SERVER`;
- 412 file TypeScript/TSX sotto `app` e `components`;
- 88 file importano almeno uno tra `useI18n`, `loadMessages` e `resolveRequestLocale`;
- 806 chiavi messaggio uniche rilevate in ciascuno dei cataloghi IT/EN/FR/ES;
- 221 file sono candidati euristici per testo italiano, inclusi API, admin, legal, commenti e contenuti non necessariamente traducibili.

Ventisei delle 54 pagine user-facing non importano direttamente gli helper i18n. Questo non dimostra automaticamente una lacuna: diverse pagine delegano tutta la UI a un componente client tradotto, sono redirect o wrapper. Ogni voce deve essere classificata durante 4B/4C prima di cambiare codice.

## Gap confermati

### 1. Metadata non localizzati

Il root layout usa attualmente titolo, descrizione e Open Graph italiani statici e dichiara `openGraph.locale = it_IT`. Non risultano ancora un contratto metadata per-locale, `alternateLocale` o una strategia hreflang/canonical coerente. Questo è un blocker di 4H, non di 4A.

### 2. Copertura delle stringhe non certificata globalmente

I test impediscono regressioni su superfici mirate, ma non provano che ogni stringa di ogni route user-facing passi dal catalogo. La scansione individua numerosi candidati ancora da classificare. Admin, Registry, Verification e Legal devono avere una decisione di scope esplicita invece di essere tradotti incidentalmente.

### 3. Locale italiani espliciti residui

Sono presenti locale italiani espliciti in superfici legali/amministrative e in alcuni ordinamenti o normalizzatori user-facing. Alcuni sono corretti per dati italiani legacy; altri devono usare il locale UI. Non vanno sostituiti in massa: 4B deve distinguere formattazione UI, normalizzazione dati e ordinamento di cataloghi legacy.

### 4. Qualità linguistica non certificata

La parità delle chiavi impedisce chiavi mancanti ma non certifica accuratezza, terminologia sportiva, genere, registro, troncamenti o contenuti identici alla lingua sorgente. Sono necessari review separati 4C–4F e smoke visivi.

### 5. Fallback e cambio lingua non verificati end-to-end

La logica è coperta unitariamente, ma mancano ancora una matrice browser/autenticazione e una regressione funzionale completa per refresh, logout/login, cookie rifiutato, preferenza remota non disponibile e hydration.

### 6. Contenuti fuori dai cataloghi

Email, notifiche persistite, errori API, contenuti generati dal server e documenti legali richiedono una policy separata. Tradurre soltanto i componenti React non garantisce un'esperienza completa nella lingua selezionata.

## Riconciliazione 4A–4I

| Sottofase | Stato verificato | Esito audit / prossimo gate |
| --- | --- | --- |
| 4A — audit stringhe e locale | **COMPLETATA** | Inventario e gap documentati; nessun runtime modificato. |
| 4B — infrastruttura i18n | **PARTIAL / DA CERTIFICARE** | Foundation sostanziale presente; classificare scope, server/client boundary, formattazione e contenuti non-React. |
| 4C — baseline italiana | **PARTIAL / DA CERTIFICARE** | Catalogo sorgente presente; eliminare o classificare hardcode user-facing e validare terminologia. |
| 4D — inglese | **PARTIAL / DA CERTIFICARE** | Catalogo key-complete; review linguistica e smoke mancanti. |
| 4E — francese | **PARTIAL / DA CERTIFICARE** | Catalogo key-complete; review linguistica e smoke mancanti. |
| 4F — spagnolo | **PARTIAL / DA CERTIFICARE** | Catalogo key-complete; review linguistica e smoke mancanti. |
| 4G — preferenza lingua | **PARTIAL AVANZATA / DA CERTIFICARE** | Precedenza, cookie e write owner-scoped presenti; test end-to-end e RLS runtime mancanti. |
| 4H — metadata e SEO | **INCOMPLETA** | Metadata root italiani statici; serve contratto SEO per-locale. |
| 4I — fallback e regressione | **PARTIAL / DA CERTIFICARE** | Unit test presenti; matrice completa e smoke multilingua mancanti. |

## Decisioni per la fase successiva

1. Non introdurre una seconda libreria i18n finché 4B non dimostra un requisito non coperto dalla foundation corrente.
2. Non rinominare tutte le route con un prefisso locale durante 4B: URL localizzati, cookie-only e SEO devono essere valutati insieme in 4H.
3. Non sostituire automaticamente ogni `it`/`it-IT`: alcuni utilizzi appartengono alla normalizzazione di dati italiani legacy.
4. Conservare l'italiano come fallback fail-safe fino alla certificazione 4I.
5. Conservare la lingua separata da residence, nationality, birth country, interessi e relocation.
6. Il lavoro resta Web-only; la parity Mobile è rinviata alla FASE 9G nella repository Mobile.
7. Nessuna sottofase successiva viene marcata completata sulla sola base della parità delle chiavi.

## Prossimo checkpoint

**FASE 4B — certificazione e consolidamento dell'infrastruttura i18n**, iniziando dalla matrice delle superfici user-facing e dalla distinzione tra:

- copy React traducibile;
- metadata/SEO;
- messaggi API ed email;
- contenuto persistito o generato dagli utenti;
- Legal/Admin/Registry/Verification;
- normalizzazione e ordinamento dati legacy.

4B dovrà essere prevalentemente conservativa: riuso della foundation esistente, nessuna riscrittura indiscriminata e nessun cambiamento Mobile.
