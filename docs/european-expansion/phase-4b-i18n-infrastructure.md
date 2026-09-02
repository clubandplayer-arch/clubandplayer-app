# FASE 4B — Certificazione e consolidamento infrastruttura i18n

## Stato

**COMPLETATA / PASS — repository Web; nessuna modifica database, API o Mobile.**

La foundation esistente è stata mantenuta e consolidata senza introdurre una seconda libreria, URL con prefisso locale o modifiche alle regole di persistenza. Questa sottofase certifica l'infrastruttura tecnica; non certifica ancora la completezza o la qualità delle singole lingue, i metadata SEO o la regressione end-to-end.

## Contratto certificato

### Lingue

- Attive e caricabili: `it`, `en`, `fr`, `es`.
- Catalogate ma inattive: `pt`, `de`.
- Default e fallback di sicurezza: italiano.
- Locale regionali supportati vengono normalizzati alla lingua base, per esempio `fr-CH → fr`.

### Risoluzione server

La precedenza resta:

1. `profile_preferences.preferred_language_id` per l'utente autenticato, se la lingua è supportata e attiva;
2. cookie first-party `cp_locale`;
3. prima lingua di `Accept-Language`;
4. italiano.

Errori di autenticazione, catalogo o preferenze falliscono in modo non bloccante verso cookie/browser/default. Il root layout carica il catalogo sul server e imposta l'attributo `lang` iniziale, evitando una baseline HTML incoerente con i messaggi renderizzati.

### Boundary client

- `I18nProvider` conserva locale e catalogo attivi.
- `setLocale` carica dinamicamente soltanto un catalogo appartenente al tipo `Locale`.
- Il cambio client aggiorna `document.documentElement.lang`.
- `LanguageSwitcher` presenta soltanto lingue supportate e attive.
- La scelta locale resta immediatamente utilizzabile anche quando la persistenza remota fallisce.

### Persistenza

- Utente anonimo: cookie same-site, path globale, durata un anno e flag `Secure` su HTTPS.
- Utente autenticato: lookup della lingua attiva e update ristretto a `preferred_language_id`.
- Se `profile_preferences` non esiste, viene inserita una riga minima; un conflitto concorrente viene recuperato con un update ristretto.
- Nessuna write lingua modifica residence, interessi geografici o relocation.
- Non viene usata una service role dal client.

### Cataloghi

- Il catalogo italiano definisce il tipo `MessageKey`.
- EN/FR/ES devono soddisfare lo stesso insieme di chiavi.
- I cataloghi secondari sono caricati dinamicamente.
- I namespace esistenti (`completion`, `feed`, `operations`, `sponsor`, `vocabulary`) restano composabili nel catalogo principale.

## Consolidamento eseguito

Le primitive pure `interpolateMessage` e `translateWithFallback` sono state estratte dal componente client in `lib/i18n/translate.ts`:

- possono essere riutilizzate da codice server o client senza importare un componente marcato `use client`;
- hanno un solo contratto di interpolazione e fallback;
- mantengono visibili i placeholder senza valore invece di cancellarli silenziosamente;
- applicano l'interpolazione anche a un messaggio ottenuto dal fallback;
- espongono la chiave come ultimo fallback diagnostico.

`I18nProvider` conserva gli export precedenti per backward compatibility, ma delega alla primitiva condivisa. Il fallback runtime dopo un cambio lingua è ora esplicitamente italiano anziché dipendere incidentalmente dal catalogo iniziale della sessione.

## Matrice delle superfici

| Superficie | Boundary 4B | Fase di contenuto/certificazione |
| --- | --- | --- |
| Componenti React client | `useI18n()` / `t()` | 4C–4F |
| Server component | `resolveRequestLocale()` + `loadMessages()` | 4C–4F |
| Root HTML `lang` | locale risolto server-side | 4I regression |
| Date e numeri | helper `Intl` locale-aware | 4C–4F |
| Metadata / Open Graph | fuori dalla certificazione 4B | 4H |
| Errori API | codici stabili; traduzione UI quando appropriata | 4C–4F / 4I |
| Email e notifiche generate | richiedono policy locale del destinatario | fase di copy dedicata, verificata entro 4I |
| Legal | scope linguistico da decidere esplicitamente | 4C–4F / compliance |
| Admin / Registry / Verification | non tradurre incidentalmente | audit di superficie dedicato |
| Contenuto utente | mai tradotto automaticamente | non applicabile |
| Mobile | nessuna modifica in questa repository | FASE 9G |

## Elementi deliberatamente rinviati

- Migrazione delle stringhe italiane residue: 4C.
- Review inglese, francese e spagnola: 4D, 4E e 4F.
- Certificazione UI/RLS/persistenza della preferenza lingua: 4G.
- Metadata localizzati, Open Graph, canonical e hreflang: 4H.
- Matrice browser, autenticazione, hydration, fallback ed end-to-end: 4I.
- Parity React Native, Android e iOS: FASE 9G.

## Sicurezza e backward compatibility

- Nessuna migration.
- Nessuna query o write remota eseguita.
- Nessuna modifica a RLS, grant, API o schema.
- Nessuna chiave esistente rinominata o rimossa.
- Nessuna nuova lingua attivata.
- Nessuna route rinominata o prefissata.
- Nessun cambiamento al cookie o alla precedenza del locale.
- Gli export puri precedentemente esposti da `I18nProvider` restano disponibili.

## Verifiche manuali

**Nessuna verifica visiva/manuale bloccante richiesta per 4B.** Il cambiamento è interno e non altera copy, layout o flussi visibili. Il cambio lingua reale, la persistenza dopo refresh/login e i fallback verranno verificati esplicitamente nei gate 4G e 4I; non devono essere considerati già certificati da questo checkpoint.

## Prossimo checkpoint

**FASE 4C — baseline italiana.** Classificare le stringhe candidate dell'inventario 4A, migrare il copy user-facing realmente hardcoded, mantenere separati locale UI e normalizzazione dati legacy, quindi eseguire smoke visivi italiani prima di autorizzare 4D.
