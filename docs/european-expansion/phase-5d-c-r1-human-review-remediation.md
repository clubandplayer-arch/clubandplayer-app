# FASE 5D-C-R1 — Remediation della review umana

## Stato e perimetro

**FASE 5D-C-R1 — IMPLEMENTATA E TESTATA; RECHECK MANUALE UI PENDING.** Questa attività corregge esclusivamente due regressioni di presentazione rilevate nella review umana della 5D-C. Non avvia 5D-D e non modifica il manifest o la migration seed già prodotti.

## Correzioni

1. La card Registro società in `/club/profile` usa ora messaggi i18n in tutti gli stati (loading, verificata, pending, errore e claim). Il testo dichiara esplicitamente che la rivendicazione è disponibile solo per organizzazioni registrate in Italia e che l'estensione internazionale è in lavorazione.
2. Tutti i valori Player non calcistici presenti in `SPORTS_ROLES` hanno ora una label controllata IT/EN/ES/FR. Il valore HTML e il valore persistito restano le stringhe legacy: cambia soltanto la presentazione.
3. La stessa localizzazione continua a essere usata sia dal ruolo principale sia dalle esperienze precedenti; nessun dato utente è riscritto.

## Stato operativo obbligatorio

| Voce | Stato |
| --- | --- |
| Fase/sottofase | **FASE 5D-C-R1** |
| Stato | **IMPLEMENTATA / TESTATA; RECHECK MANUALE PENDING** |
| Codice modificato | card Registry, vocabolario i18n, test e documentazione |
| Migration creata | **NO** |
| Migration 5D-C modificata | **NO** |
| Migration testata/applicata in questa attività | **NO / NO** |
| Production interrogata/modificata | **NO / NO** |
| RLS/grant/ownership | **NON MODIFICATI** |
| Applications | **NON MODIFICATA** |
| Dati utente/backfill | **NON MODIFICATI / NON ESEGUITO** |
| Impatto Web | label localizzate in Profile Edit |
| Impatto API | **NESSUNO** |
| Impatto Mobile FASE 5 | **NOT STARTED / NON MODIFICATO** |
| Blocker | recheck umano Preview |
| Prossimo passaggio autorizzabile | chiusura 5D-C dopo PASS umano; 5D-D richiede autorizzazione separata |

## Recheck manuale richiesto

### Club

- Account: Club senza claim verificato; lingua: Español, English e Français.
- URL: `/club/profile`.
- Atteso: eyebrow, titolo, descrizione e pulsante della card Registry nella lingua scelta.
- Atteso: la descrizione dice chiaramente “solo Italia” e comunica che la disponibilità internazionale è in lavorazione.
- Non inviare una rivendicazione.

### Player

- Account: Player; lingua: Español (ripetere almeno un controllo in English o Français).
- URL: `/player/profile`.
- Selezionare, senza salvare, `Basket`, `Pallanuoto`, `Pallamano`, `Rugby`, `Hockey su prato`, `Hockey su ghiaccio`, `Baseball`, `Softball`, `Lacrosse` e `Football americano`.
- Atteso: ogni dropdown ruolo usa la lingua scelta; nessun ruolo italiano residuo, salvo termini internazionali identici nella lingua target (per esempio `Flanker`, `Pitcher` o `Quarterback`).
- Ripetere su una riga “Esperienze precedenti”; il valore selezionato deve restare stabile cambiando lingua.
- Non salvare se non si vuole modificare il profilo usato per lo smoke.

### Console e Network

- Console: nessun nuovo errore applicativo durante i cambi sport/lingua.
- Network: nessuna richiesta fallita generata dai dropdown; il cambio lingua e il caricamento profilo devono restare 2xx.

Non è richiesto alcun controllo Supabase e la migration `20261207120000_seed_controlled_sports_vocabulary.sql` **non deve ancora essere applicata**.
