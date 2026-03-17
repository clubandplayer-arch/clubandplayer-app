# Audit tecnico micro-step: mini-card Club in `/feed`

## Ambito
- Solo analisi data-flow della mini-card Club nella colonna sinistra della `/feed`.
- Nessun fix applicato.

## 1) Componente mini-card e parent
- Route: `app/(dashboard)/feed/page.tsx`
- Parent che monta la mini-card: `FeedPage`, via import dinamico di `ProfileMiniCard` (`ssr: false`) e render in `<aside>`.
- Componente mini-card effettivo: `components/profiles/ProfileMiniCard.tsx`

## 2) Sorgente dati mini-card
Nel `useEffect` di `ProfileMiniCard`:
1. Fetch HTTP client-side su `GET /api/profiles/me`.
2. Parsing payload (`data` se presente).
3. Salvataggio oggetto profilo in stato locale `p`.
4. Costruzione riga località usando campi `interest_*` + fallback.
5. Se presenti id geografici (`interest_municipality_id`, `interest_province_id`, `interest_region_id`), query dirette Supabase dal browser su tabelle:
   - `municipalities`
   - `provinces`
   - `regions`

Quindi il flusso è misto:
- endpoint API (`/api/profiles/me`) per il profilo,
- query Supabase dirette lato client per risolvere etichette geografiche da ID.

## 3) Campi letti per la riga località mini-card Club
Riga mostrata (es. `Carlentini, Sicilia, Italia`) deriva da `interestLabel = [interest.city, interest.region, interest.country].join(', ')`.

Composizione:
- `countryCode` = `interest_country` fallback `country`
- `countryName` da resolver (`resolveCountryName` / `getCountryDisplay`)
- `cityName` iniziale da `interest_city`
- `regionName` iniziale da `interest_region` fallback `interest_province`
- Se presenti ID:
  - `interest_municipality_id` -> lookup `municipalities.name` (fallback city)
  - `interest_province_id` -> lookup `provinces.name` (fallback region)
  - `interest_region_id` -> lookup `regions.name` (fallback region)

Ordine finale di visualizzazione:
- città: `interest_city` -> `municipalities.name` -> `—`
- regione: `interest_region` -> `interest_province` -> `provinces.name` -> `regions.name` -> `''`
- nazione: `interest_country` -> `country` (solo codice sorgente) -> resolver nome paese -> `—`

## 4) Confronto con campi scritti da “Modifica profilo” Club
Form: `components/profiles/ProfileEditForm.tsx` (pagina `app/(dashboard)/club/profile/page.tsx`).

Al submit club, payload `PATCH /api/profiles/me` salva:
- campi località “nuovi/primari”:
  - `country`, `region`, `province`, `city`
- campi interesse (allineati alla località club):
  - `interest_country`
  - `interest_region_id`, `interest_province_id`, `interest_municipality_id`
  - `interest_region`, `interest_province`, `interest_city`

API `app/api/profiles/me/route.ts` permette e persiste sia campi `interest_*` sia `region/province/city`.

## 5) Diagnosi mismatch
- La mini-card Club **non** legge `region/province/city` per la riga località.
- Legge invece `interest_*` (con fallback secondario a `country` per la nazione).
- Il form club oggi scrive **entrambi** i set (`region/province/city` e `interest_*`), quindi idealmente allineati.
- Se a runtime compaiono valori legacy/non aggiornati, il punto critico è che la mini-card dipende dai campi `interest_*` (inclusi testuali legacy `interest_region`, `interest_province`, `interest_city`) e dalle query lookup su id, non dai campi `city/region/province` visualizzati/aggiornati altrove.

Conclusione audit:
- Esiste dipendenza attiva da campi `interest_*` e fallback legacy testuali.
- Nessuna dipendenza osservata in mini-card da `location_text` (non trovato nel componente auditato).
