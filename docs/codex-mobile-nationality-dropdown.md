# Codex Mobile — replica comportamento selettore “Nazionalità” (all countries)

Obiettivo: rendere il selettore mobile identico al web profile edit, mostrando **tutte le nazioni** (lista completa) invece del solo valore corrente (`Italia (IT)`).

## Comportamento di riferimento (web)

Nel web la nazionalità usa una `<select>` alimentata da una lista statica globale (`WORLD_COUNTRY_OPTIONS`), non dal solo valore salvato nel profilo.

- Sorgente opzioni: `lib/geo/countries.ts` (`COUNTRIES` + `WORLD_COUNTRY_OPTIONS`).
- Il form profilo usa quella lista per renderizzare tutte le opzioni disponibili.
- Il valore persistito è ISO2 (`IT`, `FR`, `US`, ...), con possibilità `OTHER`.

## Come replicarlo in Codex Mobile

### 1) Usa una lista master di nazioni, non il valore corrente

Nel client mobile serve una costante equivalente a `WORLD_COUNTRY_OPTIONS`:

```ts
[{ code: 'IT', label: 'Italia' }, { code: 'FR', label: 'Francia' }, ... , { code: 'OTHER', label: 'Altro…' }]
```

> Errore attuale probabile: la bottom sheet viene popolata con `[{selectedNationality}]` invece che con la lista completa.

### 2) Aprendo la bottom sheet, mostra sempre la lista completa

- `items = ALL_COUNTRIES`
- `selectedItem = profile.country ?? 'IT'`
- evidenzia l'elemento selezionato, ma non filtrare la lista al solo selected.

### 3) Mantieni parità payload con web

Quando l'utente conferma:

- salva il `code` ISO2 in `country` (es. `IT`, `FR`, `US`)
- se `code === 'OTHER'`, gestisci eventuale testo libero con campo dedicato come fa il web in altri form

### 4) (Consigliato) Aggiungi ricerca locale nella lista

Per UX mobile:

- campo cerca nella sheet (`Italia`, `France`, `IT`)
- filtro client-side su `label` e `code`

### 5) Test di regressione minimi

1. Profilo con `IT`: apri sheet → vedi tutte le nazioni, non solo IT.
2. Seleziona `FR`, salva, riapri → lista completa + `FR` selezionata.
3. `OTHER` selezionabile e persistito senza crash.

## Mappatura con implementazione web (per allineamento)

- Dataset paesi: `lib/geo/countries.ts`
- Selettore profilo (club/player): `components/profiles/ProfileEditForm.tsx`
- Uso opzioni mondiali: `WORLD_COUNTRY_OPTIONS.map(...)`

## Nota pratica per il team mobile

Se volete evitare drift nel tempo, esportate il dataset paesi da una singola fonte condivisa (JSON versionato) e consumatelo sia da web che da mobile, così stessa lista/ordine/label ovunque.
