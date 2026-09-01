# FASE 3C-E6 — Opportunity map semantics

## Stato

**IMPLEMENTATA — test automatici PASS; smoke API Preview richiesto.** E5 è chiusa sulla base dello smoke user-reported. E6 definisce e applica la semantica delle Opportunity nell'endpoint Maps senza aggiungere una nuova UI.

## Contratto

Una Opportunity può avere un pin soltanto secondo questa precedenza:

1. venue puntuale esplicita dell'Opportunity, quando lo schema la supporterà;
2. punto pubblico validato dell'organizzazione owner (`club_stadium_*`, poi coppia legacy pubblica);
3. altrimenti nessun pin.

`country_id`, `geo_area_id`, ancestors, centroid e bounds canonici descrivono l'area dell'annuncio e possono guidare viewport, filtro e label. Non diventano mai una coordinata puntuale.

## Implementazione endpoint

- Il ramo `type=opportunity` di `/api/search/map` legge `country_id` e `geo_area_id` e allega la stessa proiezione `geography` delle altre API Opportunity.
- Ogni risultato passa da `resolveOpportunityMapPlacement`; le righe senza placement pubblico vengono escluse.
- Finché non esistono colonne venue sull'Opportunity, il placement effettivo è sempre il punto pubblico owner.
- `coordinate_source=organization_venue` descrive la semantica del placement; `organization_coordinate_source` conserva se il punto owner proviene da venue o fallback legacy.
- `map_semantics=owner_public_point` e `canonical_geography_is_viewport_only=true` rendono il contratto esplicito.
- La risposta espone `placementContract=opportunity_owner_public_point_v1`; `total` conta soltanto righe realmente mappabili.

## Boundary preservati

- Nessuna migration, nuova colonna, write remoto, modifica RLS, service role, UI Opportunity map, provider, mobile o file binario.
- Nessun centroid canonico viene trasformato in pin.
- Nessun punto Player/Staff/Fan viene ereditato.
- Visibility, stato `open`, bounds spatially strict e pool owner bounded E3 restano invariati.

## Smoke API Preview richiesto

1. Chiamare `/api/search/map?type=opportunity&north=47.3&south=35.2&east=19.2&west=6&limit=20`.
2. Verificare HTTP 200 e `placementContract=opportunity_owner_public_point_v1`.
3. Per ogni elemento verificare coordinate complete, `coordinate_source=organization_venue`, `map_semantics=owner_public_point` e `canonical_geography_is_viewport_only=true`.
4. Verificare che `geography` sia presente e che eventuali ID canonicali non coincidano artificialmente con una coordinata/centroid.
5. Verificare che `total` coincida con il numero di righe restituite e che nessuna riga abbia coordinate `null`.
6. Ripetere con bounds che non contengono Club: risposta vuota, nessun fallback globale e nessun `UNKNOWN`.

## Next gate

**Non avviare E7.** Dopo lo smoke E6 si potrà chiudere la sottofase e richiedere autorizzazione separata per **FASE 3C-E7 — regressione, performance, provider e backward compatibility**.
