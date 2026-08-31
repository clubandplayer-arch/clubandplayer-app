# FASE 3C-B5 — Signup / onboarding

## Esito

**COMPLETATA — repository-only.** Il flusso dei nuovi account resta intenzionalmente minimale: Signup non raccoglie geografia, il role chooser salva soltanto `account_type` e `/onboarding` non viene trasformato in un nuovo wizard. Non sono state eseguite migration, scritture Production, attivazioni di gate o modifiche mobile.

## Contratto per ruolo

- **Player/Athlete, Staff e Fan:** la residence personale canonica è opzionale e appartiene ai flussi profilo dedicati, non a Signup o alla scelta ruolo.
- **Club e Institution:** la sede pubblica è un concetto organization-specific separato. B5 non scrive `profile_preferences.residence_country_id` o `profile_preferences.residence_geo_area_id` per questi ruoli.
- **Tutti i ruoli:** Signup crea soltanto le credenziali e gli eventuali metadata anagrafici già esistenti. Non raccoglie né scrive country, residence, interessi o sede pubblica.

## Role chooser

Il chooser usa l'endpoint ristretto `PATCH /api/onboarding/role`. Il body deve contenere esclusivamente `account_type`; chiavi aggiuntive vengono rifiutate. La write applicativa aggiorna esclusivamente quella colonna e non deriva `type`, `role`, interessi o geografia. I redirect successivi restano quelli esistenti e conducono ai flussi specifici per ruolo.

## Rimozione del default geografico

Il bootstrap non imposta più implicitamente `interest_country: 'IT'`. L'assenza del dato resta assenza: non viene convertita in residence e non produce scritture in `profile_preferences`. Interessi, residence personale e sede pubblica restano tre concetti distinti.

## `/onboarding`

La route esistente conserva il proprio comportamento di redirect/placeholder. Non contiene un selector geografico e non è stata estesa a wizard. Una futura esperienza di onboarding richiede approvazione separata.

## Limiti confermati

B5 non modifica il contratto Profile Edit, non abilita RPC o feature gate, non concede grant, non introduce migration, non modifica Production e non avvia B6. L'integrazione degli interessi geografici resta esplicitamente fuori scope.
