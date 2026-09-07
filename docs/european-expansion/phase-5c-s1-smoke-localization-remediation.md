# FASE 5C-S1 — Remediation localizzazione emersa dallo smoke

Data: 2026-09-07

## Stato e perimetro

**IMPLEMENTATA E TESTATA NEL REPOSITORY / PREVIEW RECHECK PENDING.** Questo checkpoint corregge esclusivamente regressioni di presentazione emerse nello smoke post-apply 5C. Non modifica schema, dati, API payload, ownership, Applications o cataloghi 5C e non avvia 5D.

## Correzioni

- La mini-card Player del feed usa ora `Preferred hand/foot` e localizza `Destro`, `Sinistro`, `Ambidestro` senza cambiare i valori persistiti.
- Lo stesso controlled vocabulary localizza le opzioni del form Player e il valore sport nella mini-card.
- Le parti strutturali delle card evento (badge, fallback title, callout e data) seguono la lingua applicativa; titolo, descrizione e luogo scritti dall'utente restano invariati.
- Il profilo pubblico Institution localizza intestazioni e label strutturali.
- Opportunities localizza reverse order, visita profilo Club e dialog di eliminazione; il dettaglio Opportunity usa già il catalogo server in base alla request locale.
- Discover e Following localizzano sport, ruolo e account type mantenendo inalterati i valori database.
- Le select Paese del Profile Edit mostrano i nomi tramite `Intl.DisplayNames(locale)` conservando il codice ISO persistito.

## Decisione sulla zona d'interesse Staff

La presenza di tutti i Paesi non è un difetto 5C: il campo legacy accetta una mobilità globale e dati storici extra-UE. Ridurne ora le opzioni ai sei Paesi di lancio romperebbe la modifica di valori legacy e introdurrebbe una policy di prodotto non autorizzata. 5C-S1 corregge quindi la lingua delle label, non la copertura. L'eventuale passaggio a cataloghi canonicali attivi/country-scoped appartiene a 5F (profili ed esperienze), con audit dati e backward compatibility dedicati.

## Checkpoint

| Voce | Stato |
| --- | --- |
| Fase | FASE 5C-S1 — smoke localization remediation |
| Codice modificato | componenti Web e cataloghi i18n |
| Migration creata/testata/applicata | no / non applicabile / no |
| Production interrogata/modificata | no / no in questo checkpoint |
| RLS/grant/ownership modificati | no |
| Applications modificata | no |
| Impatto Web/API | presentazione Web localizzata; API invariata |
| Mobile FASE 5 | NOT STARTED / NON MODIFICATO |
| Test automatici | 303 unit PASS; typecheck/lint/diff-check PASS; build bloccata dal fetch Google Fonts |
| Verifica manuale | Preview IT/EN richiesta; Console e Network ancora PENDING su dichiarazione utente |
| Blocker | recheck visuale e Console/Network |
| FASE 5D | NOT STARTED / NON AUTORIZZATA |
| Prossimo passaggio autorizzabile | recheck smoke 5C-S1; 5D soltanto dopo PASS esplicito |

## Recheck manuale richiesto

In Preview, con account Player, Staff, Club e Institution e lingua EN, verificare:

1. `/feed`: `Preferred hand/foot`, valore localizzato, sport localizzato e card evento strutturale in inglese;
2. `/player/profile`: opzioni preferred side e nomi Paese nella lingua corrente;
3. `/institutions/<id>`: intestazioni strutturali in inglese, contenuto utente invariato;
4. `/opportunities`: reverse order, visita Club e conferma eliminazione in inglese;
5. `/opportunities/<id>`: intestazioni/listing details in inglese;
6. `/discover` e `/following`: sport, ruolo e account type localizzati;
7. Console senza errori e Network senza nuovi 4xx/5xx.

Ripetere rapidamente in italiano per confermare assenza di regressioni. Non eseguire una cancellazione reale: aprire e chiudere il dialog è sufficiente.
