# FASE 3C-B2 — Canonical geography read contracts

## 1. Scope

FASE 3C-B2 introduce esclusivamente una foundation read-only, tipizzata e riutilizzabile per Paesi, gerarchie canoniche e geografia privata del profilo. Non collega i contratti ai form, non implementa selector o dual-write e non modifica schema, dati, migration, RLS, UI o mobile.

## 2. Audit iniziale

L'audit ha confermato la foundation già disponibile in `app/api/geo/areas/route.ts`, `lib/geo/areas.ts`, `lib/geo/profileGeography.ts`, `lib/geo/profileGeography.server.ts` e `lib/preferences/profilePreferences.ts`. Le tabelle canoniche e le RLS sono definite nelle migration esistenti; `lib/geo/location.ts` e `location_children()` restano il percorso legacy italiano. `/api/profiles/me` continua a leggere/scrivere `profiles` e non è stato modificato.

La correzione semantica necessaria emersa dall'audit è che il fallback residence italiano deve usare esclusivamente `residence_region_id`, `residence_province_id` e `residence_municipality_id`: gli `interest_*` restano interessi e non costituiscono residence.

## 3. Componenti riutilizzati

- `app/api/geo/areas/route.ts`: endpoint canonico esistente, esteso senza duplicarlo.
- `lib/geo/areas.ts`: query `geo_areas` e tipi di area.
- `lib/geo/profileGeography.ts`: orchestrazione e risoluzione canonical-first.
- `lib/geo/profileGeography.server.ts`: repository privato basato sul `SupabaseClient` del caller.
- `lib/preferences/profilePreferences.ts`: separazione residence/country interests/relocation.
- `legacy_geo_area_mappings`: mapping verificato per l'Italia.
- RLS esistenti su cataloghi, preferenze e interessi.

## 4. Componenti creati o modificati

- Creato `lib/geo/countryCatalog.ts` con `CanonicalCountryRead` e `getSupportedCountries`.
- Creato `app/api/geo/countries/route.ts` per il catalogo canonico supported+active.
- Esteso `lib/geo/areas.ts` con validazione, errori, root, children country-aware e ancestors.
- Esteso `app/api/geo/areas/route.ts`: senza `parentId` restituisce root; con `parentId` verifica appartenenza al Paese.
- Corretto il fallback in `lib/geo/profileGeography.ts` e il caricamento in `lib/geo/profileGeography.server.ts` affinché usino ID residence espliciti, non ID interest.
- Aggiunti test deterministici in `tests/unit/canonical-geography-read-contracts.test.ts`; aggiornato il test legacy pertinente.

## 5. Contratto countries

`getSupportedCountries(client)` legge `countries` con `is_supported=true` e `is_active=true`, ordinando per `display_order` e nome. Ogni elemento espone UUID stabile, ISO2/ISO3, nome ufficiale e flag di stato.

```ts
{
  id: string;
  iso2: string;
  iso3: string | null;
  officialName: string;
  isSupported: boolean;
  isActive: boolean;
  displayOrder: number;
}
```

`GET /api/geo/countries` espone solo dati catalogo pubblici già consentiti dalla RLS. Nessun catalogo statico nuovo è stato introdotto.

## 6. Contratti root/children

`getRootGeoAreas(client, countryIso2)` filtra `parent_id IS NULL`, Paese e record attivi. Supporta root eterogenee: REGION, AUTONOMOUS_COMMUNITY, CANTON, STATISTICAL_REGION e VOIVODESHIP.

`getCountryGeoAreaChildren(client, countryIso2, parentId)`:

1. valida ISO2 e UUID;
2. carica il parent;
3. restituisce `AREA_NOT_FOUND` se assente;
4. rifiuta `COUNTRY_PARENT_MISMATCH`;
5. legge soltanto figli diretti, attivi e dello stesso Paese.

`GET /api/geo/areas?country=FR` restituisce root; `GET /api/geo/areas?country=FR&parentId=<uuid>` restituisce children. L'endpoint non assume profondità o tipo del livello.

## 7. Contratto ancestors

`getGeoAreaAncestors(client, areaId, maxDepth?)` restituisce gli antenati ordinati dalla root al parent diretto. La traversal segue `parent_id`, supporta profondità variabile e rileva area assente, cross-country parent, ciclo e profondità eccessiva. Una Municipality svizzera può essere figlia diretta del Canton senza District.

## 8. Contratto canonical residence

`SupabaseProfileGeographyRepository.load(profileId)` legge in parallelo:

- `profile_preferences.residence_country_id`;
- `profile_preferences.residence_geo_area_id`;
- `profile_preferences.open_to_relocation`;
- profilo legacy;
- `profile_country_interests`;
- `profile_geo_area_interests`.

La FK composita esistente garantisce coerenza country/area. `getProfileGeography` restituisce residence, residence country, interessi e relocation come proprietà distinte. Il resolver dà sempre precedenza a `residence_geo_area_id` esplicito.

## 9. Fallback legacy italiano

Solo in assenza di residence canonica vengono considerati, dal più specifico al meno specifico:

1. `residence_municipality_id`;
2. `residence_province_id`;
3. `residence_region_id`.

Il repository interroga `legacy_geo_area_mappings` con `source_system='italy_legacy'`. Gli ID `interest_*` e `birth_*` non partecipano alla risoluzione residence.

## 10. Fallback testuale

Se canonical e mapping residence sicuro non sono disponibili, `resolveProfileResidenceGeography` restituisce `source: 'legacy_text'` conservando `country`, `region`, `province` e `city`. Un profilo privo di geografia restituisce la convenzione esistente `source: 'none'`. Il consumer può quindi distinguere `canonical`, `italy_legacy_mapping`, `legacy_text` e `none` (unavailable).

## 11. Country interests

`countryInterests` deriva esclusivamente da `profile_country_interests`, con `countryId`, `iso2` e `priority`. Non modifica e non sostituisce la residence.

## 12. Geo-area interests

`geoAreaInterests` deriva esclusivamente da `profile_geo_area_interests` e carica le aree in batch tramite `.in('id', ids)`. Ogni interesse contiene area tipizzata e priority; non viene interpretato come residence.

## 13. Relocation

`openToRelocation` è un boolean derivato da `profile_preferences.open_to_relocation === true`. Non cambia residence, country interests o geo-area interests e non introduce default geografici.

## 14. Privacy e autorizzazioni

Countries e `geo_areas` sono cataloghi pubblici secondo RLS esistente. La geografia del profilo resta privata: non è stato creato un endpoint pubblico per `SupabaseProfileGeographyRepository`, che usa il client autenticato fornito dal caller e le policy owner/admin esistenti su preferences e interest tables. Non viene usata una service role e non viene ampliata l'esposizione di `residence_geo_area_id`.

## 15. Error handling

`GeoReadError` espone codici deterministici:

- `INVALID_COUNTRY`;
- `INVALID_UUID`;
- `AREA_NOT_FOUND`;
- `COUNTRY_PARENT_MISMATCH`;
- `HIERARCHY_CYCLE`;
- `HIERARCHY_TOO_DEEP`.

L'API traduce input incoerenti in `INVALID_PAYLOAD`, parent assente in `NOT_FOUND` ed errori database in `DB_ERROR`. Non esiste un default implicito a IT.

## 16. Test eseguiti

Fixture e mock Supabase deterministici verificano:

- sei Paesi supported/active;
- root eterogenee;
- children coerenti e incoerenti;
- CH senza livello intermedio;
- ancestors a profondità 2/3;
- UUID, country e area assente;
- canonical residence;
- mapping residence legacy italiano;
- interest esclusi dal residence fallback;
- fallback testuale e profilo unavailable;
- separazione degli interessi e relocation;
- RLS owner/admin e assenza di service role;
- compatibilità dei test geografici precedenti.

Sono stati eseguiti test mirati, typecheck, ESLint pertinente e `git diff --check`.

## 17. Compatibilità legacy

`lib/geo/location.ts`, `location_children()`, le route legacy e i form non sono stati modificati. `ResidenceGeographyResolution` mantiene i source esistenti. Il cambiamento del mapping elimina soltanto l'interpretazione non sicura degli interest IDs come residence e usa i campi legacy residence espliciti già prodotti dai form.

## 18. Limiti ancora esistenti

- Nessun selector canonico: appartiene a 3C-B3.
- Nessun form usa ancora questi contratti.
- Nessun dual-write o write executor è stato implementato.
- La traversal ancestors esegue una query per livello; la profondità amministrativa è limitata e il cap protegge da loop, ma una RPC ricorsiva potrà essere valutata solo con motivazione e schema work futuro.
- La UI legacy continua a usare il catalogo statico e la gerarchia italiana.
- `source: 'none'` resta per compatibilità invece di rinominarlo `unavailable`.

## 19. Readiness per 3C-B3

La foundation è pronta per selector riutilizzabili: offre countries canonici, root, children con verifica country/parent, area types estensibili e ancestors a profondità variabile. B3 dovrà consumare questi contratti senza duplicare query, mantenendo loading/error/accessibilità e senza avviare dual-write.

## 20. File modificati

Creati:

- `app/api/geo/countries/route.ts`;
- `lib/geo/countryCatalog.ts`;
- `tests/unit/canonical-geography-read-contracts.test.ts`;
- `docs/european-expansion/phase-3c-b2-canonical-geography-read-contracts.md`.

Modificati:

- `app/api/geo/areas/route.ts`;
- `lib/geo/areas.ts`;
- `lib/geo/profileGeography.ts`;
- `lib/geo/profileGeography.server.ts`;
- `tests/unit/profile-canonical-geography.test.ts`;
- `docs/european-expansion-roadmap.md`.

Nessuna UI, write profile, migration, RLS, dato Supabase, dataset o componente mobile è stato modificato.
