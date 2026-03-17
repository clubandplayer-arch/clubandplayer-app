# STEP 3C-1 Audit chirurgico — Mini-card Club in /feed

## Obiettivo
Audit tecnico mirato (senza fix) per identificare la sorgente dati geografica usata dalla mini-card Club nel feed e confrontarla con i campi scritti dalla schermata Modifica profilo Club.

## Esito sintetico
- La mini-card Club in `/feed` è renderizzata da `components/profiles/ProfileMiniCard.tsx`, montata in `app/(dashboard)/feed/page.tsx` via `dynamic(..., { ssr:false })`.
- La mini-card legge il profilo da `GET /api/profiles/me`.
- La riga località della mini-card usa la pipeline **interest_*** (`interest_city`, `interest_region|interest_province`, `interest_country`, più risoluzione da `interest_*_id`).
- La schermata Modifica profilo Club salva sì `country/region/province/city`, ma salva anche i campi `interest_*` in parallelo (mappati da `clubLocation`).
- Il mismatch è nella **precedenza di lettura** della mini-card: privilegia `interest_*` e non i campi geografici base del profilo (`city/region/province/country`) che l’utente percepisce come “località del club” in modifica profilo.

## Catena dati
1. `/feed` include `<ProfileMiniCard />` nella colonna sinistra.
2. `ProfileMiniCard` effettua fetch a `/api/profiles/me`.
3. `GET /api/profiles/me` ritorna `select('*')` dalla tabella `profiles` per l’utente autenticato.
4. `ProfileMiniCard` costruisce `interestLabel` (city, region, country) da campi `interest_*` e lo mostra per i club.

## Prossimo micro-fix suggerito (non implementato)
Allineare la mini-card Club a una sorgente canonica coerente con la UI di modifica profilo Club:
- per i club leggere prima `city/region/province/country` (con fallback controllato a `interest_*` solo se mancanti),
- mantenendo invariato il comportamento atleta.
