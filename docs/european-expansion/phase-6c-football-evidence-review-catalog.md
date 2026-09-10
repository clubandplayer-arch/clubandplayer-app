# FASE 6C — Evidence pack e review catalog Calcio IT/FR/ES/CH/SI/PL

Data: **2026-09-10**  
Stato: **ARTEFATTI PRONTI / HUMAN REVIEW REQUIRED / IMPORT E RUNTIME NON AUTORIZZATI**

## Deliverable

- evidence pack: `data/sports/evidence/phase-6c-football-six-country-evidence-pack.json`;
- catalogo revisionabile: `data/sports/phase-6c-football-level-review-catalog.json`;
- test di contratto: `tests/unit/phase-6c-football-evidence-catalog.test.ts`.

Il catalogo copre il primo perimetro senior maschile di association football per IT, FR, ES, CH, SI e PL. Registra esclusivamente nomi fattuali necessari alla review del selector: non contiene club, classifiche, calendari, risultati o copie di database federali.

## Classificazioni

- `source_backed`: nome/scope già sostenuto dalla precedente ricerca su fonte ufficiale;
- `territorial_candidate`: nome plausibile ma non attivabile senza organizer territoriale e stagione;
- `needs_current_source_review`: fonte ufficiale individuata ma nome/formula corrente da riconfermare;
- `selectorEligibleAfterReview=true`: la voce può essere proposta per approvazione, non è già approvata;
- `importAuthorized=false` e `runtimeAuthorized=false`: nessun consumer può usare questi file come catalogo live.

Gli HTTP 403 di FFF, RFEF e SFV/ASF sono registrati come anti-automation e non come prova negativa. Per tali Paesi il pack rinvia alle ricognizioni ufficiali già versionate; serve controllo umano nel browser.

## Controllo umano obbligatorio

Eseguire il controllo senza login amministrativo e senza modificare Supabase:

1. aprire `data/sports/phase-6c-football-level-review-catalog.json` e lavorare country per country;
2. aprire il `sourceUrl` corrispondente nell'evidence pack in un browser normale;
3. per FR, ES e CH, se il portale mostra una protezione anti-bot, navigare dalla homepage ufficiale alla sezione competizioni senza tentare bypass o scraping;
4. verificare per ogni riga `source_backed`: spelling, accenti, maiuscole, segmento senior maschile, organizer, scope e stagione corrente;
5. verificare che `levelRank` sia la posizione effettiva nel sistema nazionale e non il numero di un girone;
6. per ogni `territorial_candidate`, scegliere almeno un organizer territoriale rappresentativo e confermare se label e rango siano uniformi; se variano, annotare che serviranno record distinti per organizer;
7. in Svizzera, non approvare equivalenze DE/FR/IT senza una stessa identity o pagina ufficiale comune;
8. in Polonia, verificare WZPN per WZPN se `Klasa C` esista e dove si collochi;
9. in Slovenia, verificare MNZ per MNZ i nomi sotto `3. SNL`;
10. non tradurre alcun `officialName` in base alla lingua dell'app.

### Report da restituire

Restituire una tabella o un messaggio con una riga per country nel formato:

```text
COUNTRY | SOURCE_BACKED PASS/FAIL | TERRITORIAL PASS/PARTIAL/FAIL |
CORREZIONI ESATTE | URL UFFICIALI APERTI | STAGIONE VERIFICATA
```

Allegare soltanto URL pubblici e correzioni testuali; non inviare credenziali, cookie o token. Se anche una sola voce `source_backed` è dubbia, indicare `FAIL` o `PARTIAL`: 6C rimane aperta e nessun seed/runtime viene preparato.

## Gate successivo

Soltanto dopo il report umano PASS/PARTIAL si aggiorneranno le evidenze e si deciderà quali voci promuovere. 6D resta bloccata fino a quel momento. Anche un PASS fattuale non concede automaticamente diritti di importazione e non autorizza migration, seed, API, UI o deploy.
