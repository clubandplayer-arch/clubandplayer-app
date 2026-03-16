# GEO Source of Truth Unification (WEB) — Audit tecnico

## Scope
Audit e prima unificazione concreta lato **WEB** per ridurre fonti geografiche duplicate.

## Vincolo runtime
In questo ambiente non è disponibile connessione diretta a Supabase/Postgres, quindi i check su row-count/duplicati live sono indicati come query SQL da eseguire in SQL Editor.

## Mappa reale fonti geo nella repo

### Fonte centralizzata già presente
- Endpoint: `GET /api/italy-locations`
- Hook: `useItalyLocations` (senza fallback statico hardcoded per region/province/city)
- Consumatori principali:
  - Search web (`/search`)
  - Opportunità dashboard filter/form lato client
  - Profile form/interests panel

### Fonti legacy parallele ancora presenti
- Query dirette a tabelle normalizzate `regions / provinces / municipalities`:
  - `lib/geo/location.ts`
  - `components/forms/LocationPicker.tsx`
  - `components/opportunities/OpportunityForm.tsx`
  - punti di risoluzione label per id in profile components/API

### Dataset statici locali
- `lib/opps/geo.ts` contiene fallback statico Italia (`ITALY_REGIONS`, `PROVINCES_BY_REGION`, `CITIES_BY_PROVINCE`).
- Usato come fallback resiliente del solo hook `useItalyLocations`.

## Verdetto sulle tabelle richieste

## 1) `it_locations_stage`
- **Contenuto atteso**: dataset tabellare completo Regione/Provincia/Città.
- **Uso repo web**: ora fonte primaria dell'endpoint `/api/italy-locations`.
- **Decisione**: **MANTENERE come source of truth WEB**.

## 2) `regions`
- **Contenuto atteso**: anagrafica regioni con id.
- **Uso repo web**: ancora presente in parti legacy (LocationPicker/location helper/profile id labels).
- **Decisione**: mantenere solo dove servono id legacy; **non usarla più come fonte principale per dropdown testuali WEB**.

## 3) `provinces`
- **Contenuto atteso**: anagrafica province con legame a regione.
- **Uso repo web**: come sopra, principalmente legacy/id-based.
- **Decisione**: idem `regions`.

## 4) `cities`
- **Nota**: nel codice WEB corrente si usa soprattutto `municipalities` (non `cities`) per livello comuni id-based.
- **Uso repo web**: non emerge come fonte primaria dai riferimenti correnti.
- **Decisione**: non candidata a source of truth WEB per dropdown principali.

## Source of truth proposta (e applicata in prima fase)
- **Unica fonte WEB per dropdown geografici testuali Italia**: `it_locations_stage` via endpoint `/api/italy-locations`.
- **Unico metodo consigliato**: hook `useItalyLocations` (cache + fallback).

## Prima unificazione implementata in questa PR
1. `/api/italy-locations` ora legge **solo** da `it_locations_stage` con colonne canonical `country/region/province/city`.
2. Rimosso fallback a tabella alternativa (`italy_locations_simple`) per evitare doppio backend dataset.
3. Endpoint espone metadati `source`, `countries`, `regionsByCountry`, oltre a `regions/provincesByRegion/citiesByProvince`.
4. `components/opportunities/OpportunityForm.tsx` usa ora `useItalyLocations` invece di query dirette a `regions/provinces/municipalities`.
5. `useItalyLocations` non usa più fallback statico hardcoded per località italiane.

## Legacy da rimuovere nelle prossime PR
1. Migrare `components/opportunities/OpportunityForm.tsx` da query dirette `regions/provinces/municipalities` a `useItalyLocations`.
2. Migrare `components/forms/LocationPicker.tsx` e `lib/geo/location.ts` verso adapter unico (o endpoint unico id+name se necessario).
3. Ridurre gradualmente fallback statico locale quando la disponibilità di `it_locations_stage` è garantita in tutti gli ambienti.

## Query SQL diagnostiche consigliate (da eseguire in Supabase SQL Editor)

```sql
-- struttura e count tabella stage
select count(*) as rows_stage from public.it_locations_stage;
select * from public.it_locations_stage limit 5;

-- completezza minima stage
select
  count(*) filter (where trim(coalesce(regione,''))='') as missing_region,
  count(*) filter (where trim(coalesce(provincia,''))='') as missing_province,
  count(*) filter (where trim(coalesce(comune,''))='') as missing_city
from public.it_locations_stage;

-- duplicati stage su tripletta
select regione, provincia, comune, count(*)
from public.it_locations_stage
group by 1,2,3
having count(*) > 1
order by count(*) desc
limit 100;

-- coverage su tabelle legacy
select count(*) as rows_regions from public.regions;
select count(*) as rows_provinces from public.provinces;
select count(*) as rows_cities from public.cities;
```
