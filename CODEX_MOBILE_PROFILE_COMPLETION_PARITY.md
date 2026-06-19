# Codex Mobile parity 1:1 — completamento profilo obbligatorio

Questo documento è lo spec operativo per far replicare a **Codex Mobile** il comportamento implementato sul branch web `codex/modifica-strategia-completamento-profilo`.

Obiettivo: mantenere parity 1:1 fra Web e Mobile su registrazione libera, completamento profilo obbligatorio, validazione nomi, blocco navigazione e visibilità profili.

## File Web sorgente da leggere

Codex Mobile deve leggere questi 12 file del Web e replicarne la logica equivalente nel codice mobile:

1. `app/(dashboard)/staff/profile/page.tsx`
2. `app/api/auth/whoami/route.ts`
3. `app/api/feed/starter-pack/route.ts`
4. `app/api/profiles/me/route.ts`
5. `app/api/search/route.ts`
6. `components/brand/BrandLogo.tsx`
7. `components/profiles/FanProfileForm.tsx`
8. `components/profiles/LocationFields.tsx`
9. `components/profiles/ProfileEditForm.tsx`
10. `lib/profiles/completion.ts`
11. `lib/profiles/nameValidation.ts`
12. `middleware.ts`

---

## Serie PR consigliata per Codex Mobile

### PR Mobile 1 — Utility condivise di completamento e validazione

Portare in Mobile l’equivalente di:

- `lib/profiles/completion.ts`
- `lib/profiles/nameValidation.ts`

Comportamento richiesto:

- `normalizeCompletionAccountType(profile)` deve riconoscere `athlete`, `club`, `staff`, `fan` usando `account_type` e fallback `type`.
- `getProfilePathForAccountType(accountType)` deve restituire:
  - `club` → `/club/profile`
  - `staff` → `/staff/profile`
  - `fan` → `/fan/profile`
  - default/player → `/player/profile`
- `getMissingRequiredProfileFields(profile)` deve usare gli stessi campi DB già esistenti.
- `isProfileComplete(profile)` deve essere true solo se non mancano campi.

Campi obbligatori da replicare:

#### Player/Athlete

- `full_name` valido
- `birth_year`
- `country`
- `sport`
- `role`

#### Staff

- `full_name` valido
- `birth_year`
- `country`
- `sport`
- `role`

Label mancante per ruolo: `ruolo staff`.

#### Club

- `full_name` oppure `display_name` valido come nome società
- `sport`
- `country`
- `region` oppure `interest_region_id`
- `province` oppure `interest_province_id`
- `city` oppure `interest_municipality_id`

#### Fan

- `display_name` oppure `full_name` valido come `Nome e cognome / Gruppo tifoseria`

Validazione nomi:

- Person/Fan/Staff/Player: consentire lettere Unicode, accenti, spazi, apostrofo, punto, trattino.
- Club: consentire lettere Unicode, accenti, numeri, spazi, apostrofo, virgola, punto, trattino.
- Se un valore caricato contiene caratteri non validi, ad esempio una email con `@`, il campo deve apparire vuoto al primo ingresso.

---

### PR Mobile 2 — API/session state: whoami e profilo corrente

Replicare il contratto esposto da `app/api/auth/whoami/route.ts`.

La risposta Mobile deve poter leggere/ottenere:

```ts
profile: {
  account_type,
  type,
  status,
  is_complete,
  missing_required_fields,
  completion_path,
}
```

`is_complete`, `missing_required_fields` e `completion_path` devono essere calcolati con le utility della PR Mobile 1.

Importante:

- Non modificare i flussi signup email/password, Google o Apple.
- La registrazione resta possibile anche solo con email.
- Il completamento profilo scatta dopo il primo accesso/ruolo assegnato.

---

### PR Mobile 3 — Guard globale di navigazione

Replicare il comportamento di `middleware.ts` nel router/navigation guard mobile.

Regola:

- Se utente autenticato e ruolo diverso da `guest`.
- Se `profile.is_complete === false`.
- Ogni tentativo di aprire pagine private deve mandare a `profile.completion_path`.

Path equivalenti:

- Player → `/player/profile`
- Club → `/club/profile`
- Staff → `/staff/profile`
- Fan → `/fan/profile`

Eccezioni:

- La pagina profilo corretta deve restare accessibile.
- Login/signup/onboarding devono conservare la logica esistente.

Dopo salvataggio completato:

- Fan deve essere portato alla bacheca/feed.
- Player/Staff/Club devono uscire dal blocco perché `is_complete` torna true al prossimo refresh/session check.

---

### PR Mobile 4 — Form profilo Player/Staff/Club

Replicare da `components/profiles/ProfileEditForm.tsx` e `components/profiles/LocationFields.tsx`.

UI obbligatoria:

- Banner visibile se ci sono campi mancanti:

```text
Completa il tuo profilo per continuare ad utilizzare Club & Player.

I dati richiesti servono a identificare correttamente utenti, staff e società all'interno della piattaforma.
```

- Elenco campi mancanti: `Campi mancanti: ...`
- Asterisco rosso sui campi obbligatori.
- Errore inline al salvataggio se manca un campo.
- Il form deve restare visibile, non va sostituito con una schermata errore.

Player/Staff:

- Campo `Nome e cognome` vuoto se il valore caricato è email-like/non valido.
- Sanitizzazione mentre si digita.
- Blocco salvataggio se mancano nome, anno, nazionalità, sport, ruolo.

Club:

- Campo `Nome del club` vuoto se il valore caricato è email-like/non valido.
- Sanitizzazione mentre si digita.
- Blocco salvataggio se mancano nome società, sport, nazione, regione, provincia, città.
- Le selezioni località devono contare come complete anche quando i label testuali non sono ancora popolati ma esistono gli ID `interest_*_id`.

Location fields:

- Aggiungere indicatore required configurabile come in `LocationFields.tsx`.

---

### PR Mobile 5 — Form profilo Fan

Replicare da `components/profiles/FanProfileForm.tsx`.

Comportamento Fan richiesto:

- Al primo accesso, se `full_name/display_name` contiene email o caratteri invalidi, mostrare campo vuoto.
- Label campo: `Nome e cognome / Gruppo tifoseria *`
- Placeholder: `Es. Mario Rossi / Ultras Curva Sud`
- Sanitizzazione mentre si digita con le regole person name.
- Banner campi mancanti come Web.
- Blocco salvataggio se manca un nome valido.
- Dopo salvataggio corretto, redirect alla bacheca/feed.

---

### PR Mobile 6 — Salvataggio profilo e mapping campi

Replicare la logica API di `app/api/profiles/me/route.ts` nel layer mobile/API client.

Regole:

- Per `club`, `role` deve essere `Club`.
- Per Club, dopo risoluzione località, copiare:
  - `interest_region` → `region`
  - `interest_province` → `province`
  - `interest_city` → `city`
- Per `athlete`, `staff`, `fan`, validare `full_name` con person-name validation.
- Per Club, validare `full_name` con club-name validation.
- Mantenere `account_type` e legacy `type` coerenti.

---

### PR Mobile 7 — Search, suggerimenti, starter-pack e liste pubbliche

Replicare i filtri di:

- `app/api/search/route.ts`
- `app/api/feed/starter-pack/route.ts`

Regola funzionale:

Finché il profilo non è completo:

- non appare in ricerca
- non appare in “Chi seguire”
- non appare in starter-pack/suggerimenti
- non appare in liste pubbliche

Filtri minimi:

- Player/Staff: nome valido/non vuoto, country, sport, role; staff anche `birth_year` dove usato.
- Club: nome società, sport, country, region/province/city.
- Escludere record con campi null o stringhe vuote dove Web li esclude.

---

### PR Mobile 8 — Asset logo/header

Replicare la correzione di `components/brand/BrandLogo.tsx`.

Nota Web:

- Il logo header usa asset locale `/brand/logo-wide.png`.
- Web ha impostato `unoptimized` per evitare la rotta `/_next/image?url=%2Fbrand%2Flogo-wide.png...`.
- Mobile deve usare direttamente asset locale/equivalente, senza passare da un loader remoto fragile.

---

## Checklist finale parity 1:1

Codex Mobile deve verificare:

- [ ] Signup email/password, Google, Apple non richiedono nome in fase signup.
- [ ] Dopo scelta ruolo, Fan incompleto va su `/fan/profile`, non su feed.
- [ ] Dopo scelta ruolo, Player incompleto va su `/player/profile`.
- [ ] Dopo scelta ruolo, Staff incompleto va su `/staff/profile`.
- [ ] Dopo scelta ruolo, Club incompleto va su `/club/profile`.
- [ ] Nome con email `pontile@test.it` appare vuoto in Player/Staff/Fan.
- [ ] Nome Club con email appare vuoto in Club.
- [ ] Nome persona non accetta `@ ! ?` e simboli non consentiti.
- [ ] Nome Club non accetta `!£$%=?\|#§_:;"€[]+*/@`.
- [ ] Club può usare numeri e caratteri `èéàòç,.-`.
- [ ] Se manca un campo obbligatorio, il form resta visibile e mostra errore inline.
- [ ] Fan completato viene mandato al feed.
- [ ] Profili incompleti non appaiono in ricerca/suggerimenti/liste.
- [ ] Logo header resta visibile.

