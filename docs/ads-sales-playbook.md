# Ads Sales Playbook — Club&Player

## 1) Overview
Ads in Club&Player sono sponsorizzazioni native che appaiono in posizioni dedicate del feed e delle colonne laterali. Ogni impression e click viene tracciato per reportistica mensile, con targeting per area geografica, sport, audience e device.

**Cosa tracciamo**
- **Impressions**: quante volte una creative è stata mostrata.
- **Clicks**: quante volte l’utente ha cliccato sulla creative.
- **CTR**: rapporto tra click e impression (clicks / impressions).

## 2) Inventory slot (posizione → nome slot)
- **Colonna sinistra (desktop)**
  - `left_top`
  - `left_bottom`
- **Colonna destra (desktop)**
  - `sidebar_top`
  - `sidebar_bottom`
- **Feed centrale**
  - `feed_infeed`

**Nota**: lo slot `feed_infeed` appare **1 ogni 2 post**.

## 3) Creatività: linee guida pratiche
**Ratio consigliati**
- **Sidebar/Left**: 1:1 (es. 1000×1000)
- **In-feed**: 1.91:1 (es. 1200×628). Alternative: 16:9, 4:3

**Best practice**
- Mantieni testo/logo in **safe area** centrale.
- Evita bordi sottili: possono scomparire su sfondi chiari.
- Peso file consigliato: **< 500 KB**.
- Formati supportati: **JPG / PNG / WEBP**.

## 4) Pacchetti commerciali (tabella)

| Pacchetto | Targeting incluso | Slot inclusi | Creatives consigliate | Priority suggerita | Note |
| --- | --- | --- | --- | --- | --- |
| **City** | City + Country (opz.) | left_top, sidebar_top | 1–2 | 1 | Ideale per sponsor locali |
| **Province** | Province + Country/Region (opz.) | left_top, sidebar_top, feed_infeed | 2–3 | 2 | Copertura intermedia |
| **Region** | Region + Country (opz.) | left_* + sidebar_* + feed_infeed | 3–4 | 3 | Maggiore visibilità |
| **Italy** | Country=Italy | Tutti gli slot | 4–6 | 4 | Copertura nazionale |
| **Sport-specific** | Sport specifico (es. “calcio”) | feed_infeed + sidebar_top | 2–3 | 2–3 | Valido per sponsor verticali |
| **Premium** | Area + Sport + Audience | Tutti gli slot + priorità alta | 4–8 | 5+ | Massima esposizione |

> Suggerimento: le creatives multiple servono per test A/B e rotazione.

## 5) Regole pricing (linee guida)
- **Chi paga di più** → **priority più alta**, **più slot**, **più varianti**.
- Fattori da considerare:
  - **Durata** (settimanale/mensile)
  - **Area** (City/Province/Region/Italy)
  - **Sport** (nicchia vs massa)
  - **Stagionalità** (pre-season, tornei, periodi caldi)
- Inserire placeholder nei preventivi: **[PREZZO]**, **[SCONTO]**, **[NOTE]**.

## 6) Setup operativo (passo‑passo in /admin/ads)
1. **Crea Campaign**
   - `status`: active/paused/draft
   - `priority`: numero intero (maggiore = più probabilità)
   - `start_at` / `end_at`
   - `daily_cap` (opzionale)
2. **Crea Targets**
   - `country`, `region`, `province`, `city`
   - `sport`, `audience`, `device` (vuoto = wildcard)
3. **Crea Creatives**
   - Upload immagine (bucket Supabase `ads-creatives`)
   - Inserisci `target_url`
4. **Verifica targeting**
   - Usa `/api/ads/serve?debug=1` con slot e pagina di test.

## 7) Report mensile (JOB6)
Endpoint: `/api/admin/ads/reports`

**Parametri**
- `campaign_id` (obbligatorio)
- `from` / `to` (date ISO)
- `format` = `json` o `csv`

**Metriche**
- **Impressions**: numero di visualizzazioni.
- **Clicks**: numero di click.
- **CTR**: clicks / impressions.

**Esempi colonne CSV**
- `created_at`, `event_type`, `campaign_id`, `creative_id`, `slot`, `page`, `viewer_region`, `viewer_province`, `viewer_city`, `viewer_country`, `viewer_sport`, `viewer_audience`, `viewer_user_id`

**Interpretazione CTR**
- CTR più alto su `feed_infeed` in genere indica creatività più native.
- CTR più basso su sidebar può essere normale per awareness.

## 8) Template preventivo (copiabile)

**Preventivo Sponsorizzazione — Club&Player**

- Sponsor: **[NOME SPONSOR]**
- Referente: **[REFERENTE]**
- Durata: **[DATA INIZIO] → [DATA FINE]**
- Pacchetto: **[PACCHETTO]**
- Area: **[CITY/PROVINCE/REGION/ITALY]**
- Sport: **[SPORT]**
- Audience: **[Club/Player/Tutti]**
- Device: **[Desktop/Mobile/Tutti]**
- Slot inclusi: **[SLOT]**
- Priority: **[PRIORITY]**
- Creatives incluse: **[N. CREATIVE]**

**Deliverables**
- Report mensile (impressions, clicks, CTR)
- Supporto setup creatività

**Note legali**
- [CONDIZIONI]
- [NOTE]

**Prezzo**: **[PREZZO]**
**Sconto**: **[SCONTO]**

## 9) Template report mensile (copiabile)

**Report Mensile ADS — Club&Player**

- Periodo: **[MESE/ANNO]**
- Campaign ID: **[CAMPAIGN_ID]**

**Sintesi**
- Impressions: **[N]**
- Clicks: **[N]**
- CTR: **[PERCENTUALE]**

**Top aree**
- **[AREA 1]** — [CTR]
- **[AREA 2]** — [CTR]

**Top slot**
- **[SLOT 1]** — [CTR]
- **[SLOT 2]** — [CTR]

**Note**
- [COMMENTI]

## 10) Policy contenuti
**Accettato**
- Brand sportivi, eventi, clinic, sponsor locali.
- Call-to-action chiari e veritieri.

**Non accettato**
- Claim ingannevoli o fuorvianti.
- Contenuti offensivi o non conformi alle policy Club&Player.

## 11) FAQ breve
**Posso targettizzare solo Siracusa?**
Sì: imposta `city=Siracusa` in targets e lascia gli altri campi vuoti.

**Posso cambiare creatività a metà mese?**
Sì: aggiungi nuove creatives o sostituisci la creatività mantenendo la campagna attiva.

**Come aumento la visibilità?**
Aumenta la priority, aggiungi più slot o più varianti creative.
