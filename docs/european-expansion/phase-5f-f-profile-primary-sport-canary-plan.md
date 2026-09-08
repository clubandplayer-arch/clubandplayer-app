# FASE 5F-F — Piano canary primary sport Profile

Data: 2026-09-08  
Stato: **PIANO LOCALE PREPARATO — DEPLOY E WRITE REMOTE NON ESEGUITI**

## Obiettivo

Preparare il controllo successivo a 5F-E senza eseguirlo: dimostrare, su un solo profilo test owner-scoped e dopo un deploy separatamente autorizzato, che `PATCH /api/profiles/me` preserva il client legacy e applica atomicamente il primary sport canonicale. Questa fase non autorizza merge, deploy, chiamate PATCH remote, backfill o modifiche SQL.

## Perimetro

Inclusi soltanto `profiles.sport`, `sport_id`, `sport_discipline_id`, `sport_variant_id`, la risposta della route e i codici 400/403/500. Esclusi UI, selector, Competition, altri campi Profile/Experience, nuove migration, 5D-C, 5D-E-I, seed e import. Preview resta non verificato e 5F-A non deve essere rieseguita.

## Prerequisiti bloccanti prima del canary

1. commit 5F-E revisionato e identificatore del deploy verificato;
2. ambiente destinatario dichiarato esplicitamente;
3. account canary dedicato, non amministratore, proprietario di una sola riga Profile;
4. snapshot read-only delle quattro colonne e dei nove trigger;
5. mapping legacy/catena canonicale scelti e verificati attivi;
6. piano di ripristino atomico dello snapshot approvato;
7. nuova autorizzazione esplicita per deploy e singola write canary.

Il profilo reale osservato con `sport="Calcio"` e ID null non viene selezionato automaticamente: la lettura non autorizza a trasformarlo né costituisce un backfill.

## Matrice minima futura

1. GET baseline e snapshot delle quattro colonne;
2. un solo PATCH legacy owner-scoped con valore invariato e mapping univoco;
3. GET read-after-write: legacy stabile e catena canonicale completa/coerente;
4. un PATCH canonicale invalido su account canary separato o transazione controllata: HTTP 400 `invalid_reference` e stato invariato;
5. verifica log senza dettagli DB e inventario trigger invariato;
6. ripristino atomico esatto dello snapshot, quindi GET finale.

Non usare il reset API come rollback se lo snapshot iniziale era `sport="Calcio"` con ID null: il reset produrrebbe quattro null e non ripristinerebbe lo stato iniziale. Il ripristino dovrà essere una singola operazione amministrativa esplicitamente approvata oppure il canary dovrà usare un profilo disposable con stato iniziale ricreabile.

## Stop gate

Il piano è **READY_FOR_HUMAN_REVIEW**, non ready-to-run. Fermarsi finché non sono noti ambiente, deploy ID, account canary e metodo di ripristino. Non è stata eseguita alcuna operazione remota.

## Prossimo controllo concreto

Review umana del piano e scelta tra profilo canary disposable oppure ripristino amministrativo atomico dello snapshot. Solo questa decisione consente di preparare comandi eseguibili; non serve ancora completare 5D-C o 5D-E-I.
