# FASE 3C-B6.1 — Geographic interests write boundary

## Stato

**COMPLETATA — repository-only.** Questo primo passaggio controllato di B6 introduce il boundary API owner-only per leggere e modificare country interests, geo-area interests e disponibilità al trasferimento. B6 resta **IN PROGRESS**: nessuna UI è stata attivata e nessun rollout è autorizzato.

## Contratto

`GET /api/profile-geography/interests` restituisce separatamente:

- `profile_country_interests`;
- `profile_geo_area_interests`;
- `profile_preferences.open_to_relocation`.

`PATCH /api/profile-geography/interests` accetta esattamente una operazione per richiesta:

- `{ "openToRelocation": boolean }`;
- `{ "countryInterest": { "countryId": UUID, "selected": boolean } }`;
- `{ "geoAreaInterest": { "geoAreaId": UUID, "selected": boolean } }`.

La granularità singola evita aggiornamenti parziali tra concetti indipendenti. Country e aree devono appartenere ai cataloghi canonici supported/active. Le policy RLS esistenti restano la barriera database e il server ricava sempre `profile_id` dall'utente autenticato.

## Separazione semantica

Il boundary non legge né scrive residence canonica, legacy `interest_*`, birth country, nationality o sede pubblica. `open_to_relocation` non modifica la residence. Un interesse per un Paese o un'area non è prova di residence e non viene proiettato in `profiles`.

## Esclusioni

Nessuna migration, RPC, feature gate, UI, modifica mobile, backfill o scrittura remota è inclusa. Il prossimo passaggio B6 dovrà progettare e collegare la UI web usando questo contratto, con approvazione separata prima di qualsiasi attivazione.
