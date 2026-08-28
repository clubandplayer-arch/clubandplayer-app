# FASE 3C-B1 — Audit dei flussi geografici UI/write dei profili

## 1. Executive summary

**Stato dell'audit: COMPLETATO (read-only/code-only).** L'audit conferma che i flussi web attivi di modifica profilo restano prevalentemente legacy e Italy-centric. `ProfileEditForm` serve Club, Player/Athlete, Staff e Institution; `FanProfileForm` serve Fan. Entrambi leggono e scrivono `profiles` tramite `/api/profiles/me`, usando campi testuali e ID legacy italiani. La UI non legge né scrive `profile_preferences.residence_geo_area_id`, `profile_country_interests` o `profile_geo_area_interests`.

La foundation canonica esiste: `geo_areas`, `countries`, `legacy_geo_area_mappings`, `/api/geo/areas`, `getGeoAreas`, `SupabaseProfileGeographyRepository`, `resolveProfileResidenceGeography`, `getProfileGeography` e `buildProfileGeographyDualWrite`. L'audit non ha trovato import applicativi di `profileGeography*` fuori dai relativi file e dai test: è quindi **implementata ma non collegata alla UI**.

Il rischio principale è semantico: in più punti `country` è chiamato “nazionalità” ma viene riutilizzato come Paese/residence o sede; per Player/Staff la residence UI non è mostrata, mentre il payload continua a trasportare campi residence legacy. `interest_*` alimenta visualizzazione, suggerimenti e sede delle organizzazioni, ma non può essere promosso automaticamente a residence canonica.

Nessun comportamento, schema, dato, test o componente è stato modificato in questa fase.

## 2. Scope e vincoli

Sono stati auditati lettura, visualizzazione, selezione, validazione, trasformazione, salvataggio e sincronizzazione della geografia profilo nel repository web. Search e Maps sono inclusi soltanto dove consumano direttamente campi dei profili. Sono escluse modifiche applicative, UI, API, migration, Supabase, dataset, test, backfill e qualsiasi implementazione di 3C-B2 o successive.

Decisioni vincolanti confermate:

1. `geo_areas` è la geografia canonica europea.
2. Read priority futura: canonical → Italy legacy mapping → legacy textual fallback.
3. `regions`, `provinces`, `municipalities` e le compatibilità italiane restano attive durante la transizione.
4. Nessun backfill residence automatico dagli `interest_*`.
5. `profile_country_interests`, `profile_geo_area_interests` e `birth_country` non sono residence.
6. La residence canonica richiede input esplicito e dual-write controllato.
7. `REGION → PROVINCE → MUNICIPALITY` non è universale.
8. Le UI future devono supportare IT, FR, ES, CH, SI e PL.
9. Web è la baseline; mobile parity resta NOT STARTED.

## 3. Metodo di audit

Audit statico read-only mediante:

- inventario dei file con `rg --files`;
- ricerca dei campi geografici, tabelle, RPC, query e operazioni `insert/update/upsert` con `rg`;
- lettura diretta di componenti, route, helper, hook, tipi e migration rilevanti;
- verifica degli import per distinguere codice attivo, foundation non collegata e file apparentemente inutilizzati;
- confronto con la roadmap e il commit documentale `3cba450`.

Legenda evidenze:

- **CONFERMATO:** comportamento direttamente visibile nel codice.
- **INFERITO:** conseguenza probabile, da verificare a runtime.
- **NON TROVATO:** simbolo/file o collegamento non presente nella ricerca statica.
- **APPARENTEMENTE INUTILIZZATO:** file esistente senza import/uso trovato.

## 4. Inventory dei file e simboli

### Entry point e form

| Percorso | Simbolo | Stato/ruolo geografico |
| --- | --- | --- |
| `app/signup/SignupClient.tsx` | `SignupPage`, `onSubmit` | Signup auth; nessun campo geografico. |
| `app/onboarding/choose-role/page.tsx` | `ChooseRolePage`, `choose` | Scrive solo `account_type`; nessuna geografia. |
| `app/(dashboard)/onboarding/page.tsx` | `OnboardingPage` | Redirect/check profilo; placeholder, nessun form geografico. |
| `app/(dashboard)/club/profile/page.tsx` | `ProfilePage` | Monta `ProfileEditForm`. |
| `app/(dashboard)/player/profile/page.tsx` | `ProfilePage` | Monta `ProfileEditForm`; usato anche come destinazione Staff dal role chooser. |
| `app/(dashboard)/staff/profile/page.tsx` | `StaffProfilePage` | Monta `ProfileEditForm`. |
| `app/(dashboard)/fan/profile/page.tsx` | `FanProfilePage` | Monta `FanProfileForm`. |
| `app/institution/profile/page.tsx` | `InstitutionProfilePage` | Monta `ProfileEditForm`. |
| `components/profiles/ProfileEditForm.tsx` | `ProfileEditForm`, `loadProfile`, `onSubmit` | Flusso principale Club/Player/Staff/Institution. |
| `components/profiles/FanProfileForm.tsx` | `FanProfileForm`, `onSubmit` | Flusso Fan dedicato. |
| `components/profiles/LocationFields.tsx` | `LocationFields` | Selector legacy IT; testo libero per Paesi non IT. |
| `components/profiles/InterestAreaForm.tsx` | `InterestAreaForm`, `save` | **Apparentemente inutilizzato**; nessun import trovato. |
| `components/profiles/ProfileForm.tsx` | `ProfileForm`, `submit` | **Apparentemente inutilizzato**; legacy create form athlete/club. |
| `app/institution/profile/submit/route.ts` | `POST` | Route form legacy testuale; pagina corrente non la usa. |

### API, helper e hook

| Percorso | Simbolo | Fonte/destinazione |
| --- | --- | --- |
| `app/api/profiles/me/route.ts` | `GET`, `PATCH`, `FIELDS` | `profiles`; normalizza payload e risolve label legacy IT. |
| `app/api/profiles/route.ts` | `POST` | Upsert legacy `profiles`; endpoint del `ProfileForm` apparentemente inutilizzato. |
| `app/api/profiles/bootstrap/route.ts` | `POST` | Crea profilo base con `interest_country: 'IT'`. |
| `lib/geo/location.ts` | `fetchLocationChildren`, `normalizeLocation`, `findMatchingLocationId` | RPC `location_children`, fallback tabelle legacy. |
| `hooks/useGeo.ts` | `useGeo` | API legacy `/api/geo/regions|provinces|municipalities`. |
| `hooks/useItalyLocations.ts` | `useItalyLocations` | `/api/italy-locations`, staging/fallback stringhe; non è il selector principale profilo. |
| `app/api/geo/regions/route.ts` | `GET` | Legge `regions`. |
| `app/api/geo/provinces/route.ts` | `GET` | Legge `provinces` per `region_id`. |
| `app/api/geo/municipalities/route.ts` | `GET` | Legge `municipalities` per `province_id`. |
| `app/api/geo/areas/route.ts` | `GET` | Endpoint canonico country/parent/level, non usato dai form profilo. |
| `lib/geo/areas.ts` | `getGeoAreas`, `getGeoAreaChildren`, `getGeoAreaById` | Read canonico `geo_areas`. |
| `lib/geo/profileGeography.ts` | `resolveProfileResidenceGeography`, `getProfileGeography`, `buildProfileGeographyDualWrite` | Foundation canonical-first e builder payload; non collegata. |
| `lib/geo/profileGeography.server.ts` | `SupabaseProfileGeographyRepository` | Legge canonical + legacy mapping + interessi; non collegato. |
| `lib/preferences/profilePreferences.ts` | `resolveResidenceCountry`, `resolveCountriesOfInterest`, `resolveOpenToRelocation` | Resolver canonici di preferenze; non usati nei form. |
| `lib/geo/countries.ts` | `WORLD_COUNTRY_OPTIONS` | Catalogo statico mondiale UI, non tabella canonica `countries`. |
| `types/profile.ts` | `Profile` | Espone soltanto `country/region/province/city` per la geografia generale; incompleto rispetto ai form. |

### Read-only consumer diretti dei campi profilo

| Percorso | Simbolo | Comportamento |
| --- | --- | --- |
| `components/profiles/ClubProfileDetails.tsx` | `ClubProfileDetails` | Legge `/api/profiles/me`, risolve ID `interest_*` su tabelle legacy. |
| `components/profiles/ProfileMiniCard.tsx` | `ProfileMiniCard` | Mostra interest geography; ID legacy prevalgono sulle label; stadio usa `club_stadium_lat/lng`. |
| `app/(dashboard)/players/[id]/page.tsx` | pagina player | Risolve `interest_*_id` tramite tabelle legacy, poi fallback testuale. |
| `hooks/useCurrentProfileContext.ts` | `useCurrentProfileContext` | Espone city come `interest_city ?? city`. |
| `app/api/clubs/geolocated/route.ts` | `pickCoordinatePair`, `GET` | Per Club preferisce coordinate stadio, poi `latitude/longitude`. |
| `app/api/search/map/route.ts` | `GET` | Consuma coordinate e campi legacy del profilo; logica di precedenza non uniforme. |
| `app/api/search/clubs-in-bounds/route.ts` | `GET` | Query bounds su `latitude/longitude`, fallback stadio nella trasformazione. |
| `app/api/feed/starter-pack/route.ts`, `app/api/feed/highlights/route.ts` | `GET` | Preferiscono `interest_city` a `city`. |
| `app/api/suggestions/who-to-follow/route.ts`, `app/api/follows/suggestions/route.ts` | `GET` | Ranking/filter su `interest_*` testuali e ID legacy. |

## 5. Matrice completa dei flussi per account type

| Account type | Entry UI attivo | Campi mostrati/modificabili | Write path | Stato canonico | Gap principale |
| --- | --- | --- | --- | --- | --- |
| Club | `/club/profile` → `ProfileEditForm` | `country`, region/province/city, interest IDs/label, stadio/coordinate | PATCH `/api/profiles/me` → `profiles.update/upsert` | Nessuno | Sede duplicata in `country`, `region/province/city` e `interest_*`; selector IT-only. |
| Player/Athlete | `/player/profile` → `ProfileEditForm` | country/nazionalità, birth country/location, area interesse; residence state esiste ma UI residence non trovata | PATCH `/api/profiles/me` → `profiles` | Nessuno | `country` inizializza residence; residence legacy non mostrata; interest può dominare display. |
| Staff | `/staff/profile` o redirect `/player/profile` → `ProfileEditForm` | Stesso ramo non-organization/non-fan del Player | PATCH `/api/profiles/me` → `profiles` | Nessuno | Semantica e pulizia campi condivise col Player; nessun canonical residence. |
| Fan | `/fan/profile` → `FanProfileForm` | `country` e area di interesse; `LocationFields` | PATCH `/api/profiles/me` → `profiles` | Nessuno | Tutti i campi residence vengono azzerati; interessi solo legacy single-area. |
| Institution/ENTE | `/institution/profile` → `ProfileEditForm` | Paese e sede organization | PATCH `/api/profiles/me` → `profiles` | Nessuno | Condivide mapping organization/interest del Club; route submit testuale alternativa non collegata. |
| Signup | `/signup` → `SignupPage` | Nessuna geografia | `supabase.auth.signUp` metadata nome | Non applicabile | Nessun input residence country. |
| Role onboarding | `/onboarding/choose-role` → `choose` | Nessuna geografia | PATCH `account_type` | Non applicabile | Default bootstrap `interest_country='IT'` può introdurre assunzione Italia. |
| Generic onboarding | `/onboarding` | Nessun form reale | Solo GET/redirect | Non applicabile | Placeholder; componente geografico non trovato. |

## 6. Matrice read path

| Flusso | Origine | Query/helper | Ordine/fallback effettivo | Evidenza |
| --- | --- | --- | --- | --- |
| Form principale | `/api/profiles/me` | `GET` → `profiles.select('*')` | Solo riga legacy `profiles` | CONFERMATO |
| Fan form | `/api/profiles/me` | `GET` | Solo `profiles` | CONFERMATO |
| Location selector IT | Supabase browser | `fetchLocationChildren` → RPC `location_children`; poi tabelle legacy | RPC → `regions/provinces/municipalities` | CONFERMATO |
| Location non IT | Stato/form | `LocationFields` input testo | `regionName` e `cityName`; provincia disabilitata | CONFERMATO |
| Club detail/mini card/player detail | `profiles.interest_*` | query dirette tabelle legacy | ID legacy → label testuale → campi generalisti | CONFERMATO |
| Canonical profile helper | `profile_preferences`, `profiles`, canonical interest tables | `SupabaseProfileGeographyRepository.load` | canonical → Italy mapping → legacy text | CONFERMATO MA NON COLLEGATO |
| Canonical area API | `geo_areas` + `countries` | `/api/geo/areas` → `getGeoAreas` | Filtri country/parent/level | CONFERMATO MA NON USATO DAI FORM |
| Maps Club | campi `profiles` | `pickCoordinatePair` | `club_stadium_lat/lng` → `latitude/longitude` | CONFERMATO per `/api/clubs/geolocated` |

Il read path attivo dei form **non è canonical-first**. Il canonical-first esiste soltanto nella foundation non collegata.

## 7. Matrice write path

| Producer | Payload geografico | Destinazione/operazione | Trasformazione/sync |
| --- | --- | --- | --- |
| `ProfileEditForm.onSubmit` Club/Institution | `country`, `region`, `province`, `city`, `interest_country`, `interest_*`, `club_stadium_lat/lng` | PATCH `/api/profiles/me`; `profiles.update`, fallback `upsert` | ID solo per IT; organization usa sede anche come interest geography. |
| `ProfileEditForm.onSubmit` Player/Staff | `country`, `region/province/city`, `residence_*_id`, `birth_*`, `interest_*` | Stesso | Residence IDs solo IT; birth IDs solo IT; testo estero. |
| `FanProfileForm.onSubmit` | `country`, `interest_country`, `interest_*`; azzera residence/birth/stadium | Stesso | ID solo IT; testo `interest_city` estero. |
| `InterestAreaForm.save` | `interest_*` | Stesso | Per non IT azzera ID e tutte le label territoriali; apparentemente inutilizzato. |
| `ProfileForm.submit` | `country/region/province/city` testuali | POST `/api/profiles`; `profiles.upsert` | Per IT usa selector legacy, ma non invia gli ID; apparentemente inutilizzato. |
| `app/institution/profile/submit/route.ts` | campi testuali `country/region/province/city` | `profiles.update` | Nessuna canonicalizzazione; route non collegata alla pagina corrente. |
| `profiles/bootstrap` | `interest_country: 'IT'` | `profiles.upsert` | Default Italia hardcoded. |

Nessun write UI trovato verso `profile_preferences`, `profile_country_interests` o `profile_geo_area_interests`. Nessun caller trovato per `buildProfileGeographyDualWrite`.

## 8. Validation e payload

### `LocationFields`

- **IT:** selezione vincolata region → province → municipality con ID numerici e reset dei figli al cambio parent.
- **Non IT:** region e city sono testo libero; province è assente/disabilitata; city è `required` quando il Paese non è IT.
- Matching fallback legacy tramite `normalizeLocation`/`findMatchingLocationId`; può fare match parziale.

### `/api/profiles/me` (`FIELDS`, `PATCH`)

- Allowlist tipizzata `text|number|bool|json`; numeri non finiti diventano `null`; testo trim/collapse spaces.
- Uppercase per `country`, `interest_country`, `birth_country`.
- Se `interest_country` manca nel PATCH, viene impostato a `IT`: comportamento potenzialmente distruttivo per PATCH parziali.
- Se interest country è IT, risolve label da `municipalities`, `provinces`, `regions`.
- Per Club copia `interest_region/province/city` anche nei campi `region/province/city`.
- Non valida coerenza parentale region/province/municipality a livello route; la sincronizzazione DB potrebbe intervenire, ma non è verificabile dal codice applicativo.
- Non accetta `residence_country_id`, `residence_geo_area_id`, `open_to_relocation` o relazioni canonical interest.

### Validazione form

`ProfileEditForm` usa `getMissingRequiredProfileFields`, validazioni nome, normalization country e controlli di completezza delle esperienze. `FanProfileForm` valida il nome e i required fields Fan. Non è presente uno schema condiviso (Zod o equivalente) per la geografia canonica.

## 9. Dipendenze legacy italiane

| Dipendenza | Uso applicativo verificato | Nota |
| --- | --- | --- |
| `regions` | selector, API, label resolution, card/detail | Attiva. |
| `provinces` | selector, API, label resolution | Attiva. |
| `municipalities` | selector, API, label resolution | Attiva. |
| `location_children()` | `fetchLocationChildren`; OpportunityForm fuori scope profilo | Attiva con fallback tabelle. |
| `municipality_sync_region()` | Nessun riferimento applicativo o definizione migration trovato dalla ricerca | NON TROVATO nel repository tracciato; non dedurre assenza in Production. |
| `profile_location_coerce()` | Nessun riferimento applicativo o definizione migration trovato | NON TROVATO nel repository tracciato; non dedurre assenza in Production. |
| legacy FK/ID numerici | `residence_*_id`, `birth_*_id`, `interest_*_id` | Attivi e IT-only. |
| `legacy_geo_area_mappings` | Solo `SupabaseProfileGeographyRepository` | Foundation non collegata. |

Le strutture legacy non devono essere rimosse durante 3C-B2–B7.

## 10. Stato della foundation canonica

| Elemento | Stato | Collegamento UI |
| --- | --- | --- |
| `countries` | Presente | I form usano invece `WORLD_COUNTRY_OPTIONS` statico. |
| `geo_areas` | Presente e popolato | Nessuno nei form. |
| `legacy_geo_area_mappings` | Presente | Solo repository canonico non importato dall'app. |
| `profile_preferences.residence_country_id` | Presente | Nessuno. |
| `profile_preferences.residence_geo_area_id` | Presente | Nessuno. |
| `profile_country_interests` | Presente | Nessuno. |
| `profile_geo_area_interests` | Presente | Nessuno. |
| `open_to_relocation` | Presente in preferences | Nessuna UI/read/write profilo. |
| `/api/geo/areas` + `lib/geo/areas.ts` | Read API/helper presente | Nessun consumer profilo trovato. |
| `SupabaseProfileGeographyRepository` | Read repository presente | Nessun import/caller trovato. |
| `resolveProfileResidenceGeography` | Canonical-first resolver presente | Nessun import/caller applicativo trovato. |
| `buildProfileGeographyDualWrite` | Builder payload presente | Nessun write executor/caller trovato. |

Classificazione: **FOUNDATION IMPLEMENTATA MA NON ANCORA COLLEGATA ALLA UI**.

## 11. Assunzioni geografiche hardcoded

1. `country !== 'IT'` determina testo libero anziché gerarchia canonica.
2. La gerarchia UI è fissa region → province → municipality.
3. Gli ID geografici sono `number`, incompatibili con UUID `geo_areas.id`.
4. `interest_country` ha default IT nel bootstrap e nel PATCH quando omesso.
5. Le label e placeholder (“Regione”, “Provincia”, “Città”) riflettono l'Italia.
6. I form offrono un catalogo mondiale statico, non i soli Paesi supported/active canonici.
7. Per estero la provincia viene eliminata e non può modellare FR/ES/CH/PL correttamente.
8. Player/Staff inizializzano `residenceCountry` da `profile.country`, confondendo nazionalità/Paese legacy con residence.
9. Club/Institution usano gli stessi `interest_*` per descrivere la sede.
10. Consumer feed/suggestions preferiscono spesso `interest_*` a geography generale, con semantica non uniforme.

## 12. Gap e rischi

| Priorità | Gap/rischio | Impatto | Fase consigliata |
| --- | --- | --- | --- |
| Critica | Nessun form legge/scrive residence canonica | Nuovi dati restano legacy | B2/B4 |
| Critica | `interest_*` sovraccaricati come sede, interesse e fallback | Backfill/resolution semanticamente pericolosi | B2/B4/B6 |
| Alta | `PATCH` defaulta `interest_country='IT'` se assente | PATCH parziali possono cambiare interesse | B4 regression |
| Alta | Nessuna validazione parent/country canonica nel write API | Possibili combinazioni incoerenti | B2/B4 |
| Alta | Gerarchia fissa IT; estero testuale e senza provincia | FR/ES/CH/SI/PL non supportati realmente | B3 |
| Alta | Residence Player/Staff non mostrata ma stato/payload legacy esistono | Input non esplicito e dati stale | B4 |
| Media | Catalogo Paesi statico diverso da `countries` | Drift supported/active | B2/B3 |
| Media | Tipi TypeScript incompleti e uso esteso di `any` | Regressioni payload | B2/B4 |
| Media | Read consumer legacy non uniformi | UI/search/maps possono divergere | B2/B7 |
| Media | Coordinate Map con priorità differente tra endpoint | Pin Club inconsistenti | B7 (Maps resta 3C-E) |
| Bassa | `ProfileForm`, `InterestAreaForm`, institution submit apparentemente inutilizzati | Superficie morta/confusione | B7, senza rimozione automatica |
| Da verificare | `municipality_sync_region()` e `profile_location_coerce()` non trovati | Dipendenza Production non documentabile dal repo | B7/schema audit read-only |

## 13. Componenti non trovati o non verificabili

- Nessun wizard geografico o modale geografico separato trovato.
- Nessun selector profilo country-aware/hierarchy-aware canonico trovato.
- Nessun import UI di `/api/geo/areas`, `getGeoAreas` o `getGeoAreaChildren` trovato.
- Nessun caller applicativo di `SupabaseProfileGeographyRepository`, `getProfileGeography` o `buildProfileGeographyDualWrite` trovato.
- Nessun write UI a `profile_preferences`, `profile_country_interests`, `profile_geo_area_interests` trovato.
- Nessuna UI `open_to_relocation` trovata nei flussi profilo.
- `ProfileForm` e `InterestAreaForm` risultano apparentemente inutilizzati dalla ricerca degli import.
- La route `app/institution/profile/submit/route.ts` non risulta usata dalla pagina Institution corrente.
- Definizioni repository di `municipality_sync_region()` e `profile_location_coerce()` non trovate; esistenza/comportamento Production non verificati perché l'audit non si collega a Production.

## 14. Piano d'integrazione 3C-B2 → 3C-B7

### 3C-B2 — Canonical geography read APIs/helpers

Definire contratti read standardizzati per catalogo Paesi supported/active, root/children, ancestors, area by ID, profile residence e interessi. Riutilizzare la foundation esistente, esplicitare error/fallback e mantenere adapter legacy italiani senza modificare UI.

### 3C-B3 — Reusable canonical geography selectors

Creare selector UUID country-aware e hierarchy-aware guidati da `area_type/level/parent_id`, non da tre campi fissi. Supportare IT, FR, ES, CH, SI, PL; accessibilità, loading/error/reset e label per tipo area.

### 3C-B4 — Profile Edit dual-write

Integrare prima `ProfileEditForm` e `FanProfileForm`: input residence esplicito, canonical write primario, legacy write solo quando semanticamente sicuro. Non usare `interest_*` per inferire residence. Separare sede organization, residence personale e interessi.

### 3C-B5 — Signup/onboarding

Dopo la validazione di Profile Edit, aggiungere input canonici per nuovi account e rimuovere assunzioni implicite IT, preservando tutti gli account type.

### 3C-B6 — Geographic interests

Collegare `profile_country_interests`, `profile_geo_area_interests` e `open_to_relocation` con UI e write distinti dalla residence; definire cardinalità, priority e reset.

### 3C-B7 — Compatibility and regression

Certificare profili legacy/nuovi per sei Paesi e cinque account type, API, fallback, RLS e consumer diretti. Verificare file apparentemente inutilizzati e uniformità dei read consumer; nessuna rimozione legacy incidentale.

## 15. Ordine consigliato delle modifiche future

1. Contratti e tipi read B2.
2. Resolver country e area chain server-side B2.
3. Adapter legacy IT e fallback testuale B2.
4. Selector canonico isolato B3.
5. Profile Edit organization, poi Player/Staff, poi Fan B4.
6. Signup/onboarding B5.
7. Interest tables e relocation B6.
8. Consumer/read regression e matrice account/country B7.

Ogni step deve restare separato e non va iniziato automaticamente da questo audit.

## 16. Acceptance criteria per FASE 3C-B2

B2 sarà accettabile quando, senza collegare nuovi form:

- esisterà un contratto typed per Paesi supported/active e `geo_areas`;
- root, children, area by ID e ancestors saranno accessibili in modo country-aware;
- residence, country interests e geo-area interests saranno letti come concetti distinti;
- la priorità canonical → Italy mapping → testo legacy sarà coperta e documentata;
- gli errori e i fallback non saranno silenziosamente confusi con “nessun dato”;
- non sarà assunta una gerarchia universale a tre livelli;
- IT, FR, ES, CH, SI e PL saranno rappresentabili;
- nessun write, selector UI, backfill o modifica schema sarà incluso;
- i consumer legacy resteranno funzionanti;
- test mirati saranno pianificati/eseguiti nella fase B2, senza modifiche anticipate in B1.

## 17. Conclusione e checkpoint

FASE 3C-B1 è **COMPLETATA** come audit documentale. Il deliverable mappa i flussi attivi, le dipendenze legacy, la foundation canonica scollegata, i rischi e l'ordine d'integrazione.

- **Last completed phase:** FASE 3C-B1 — Audit UI/write flows.
- **FASE 3C-B complessiva:** NOT COMPLETED.
- **Next phase:** FASE 3C-B2 — Canonical geography read APIs/helpers.
- **Automatic residence backfill:** FORBIDDEN / DELIBERATELY EXCLUDED.
- **Mobile international parity:** NOT STARTED.
- **Modifiche comportamentali in B1:** nessuna.

Non iniziare automaticamente la FASE 3C-B2.
