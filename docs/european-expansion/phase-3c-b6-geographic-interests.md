# FASE 3C-B6 — Geographic interests

## Stato

**COMPLETATA — repository-only.** B6 introduce il boundary API owner-only e la relativa UI web in `/settings` per leggere e modificare country interests, geo-area interests e disponibilità al trasferimento. Nessun rollout Production è stato eseguito.

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

## UI web

La sezione “Interessi geografici” di `/settings` usa il selector geografico canonico country/area già validato. Consente di aggiungere e rimuovere più Paesi e aree e di modificare separatamente `open_to_relocation`. Ogni azione invia una singola operazione al boundary B6, ricarica lo stato owner-only restituito dal server e mostra un esito accessibile.

La copy localizzata chiarisce esplicitamente che interessi e relocation non modificano residence o sede pubblica. Non viene letto o aggiornato alcun campo legacy `profiles.interest_*`.

## Esclusioni e verifica

Nessuna migration, RPC, feature gate, modifica mobile, backfill o scrittura remota è inclusa. Prima di B7 è richiesta una verifica manuale autenticata in un ambiente non-Production della sezione `/settings`: aggiunta/rimozione di un Paese e di un'area, toggle relocation, persistenza dopo refresh e conferma che residence e sede pubblica restino invariate.
