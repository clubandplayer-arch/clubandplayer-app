# Audit tecnico — Pagina profilo Staff (`/player/profile`) per Codex Mobile

## Obiettivo
Questo documento descrive **come replicare 1:1** la pagina profilo staff del web, con focus su:
- sorgenti file da considerare fonte di verità,
- lifecycle di caricamento/modifica/salvataggio,
- gestione campi e pulizia payload per tipo account,
- cause probabili dell'errore su **Anno di nascita** (`profiles_birth_year_check`) e regole preventive.

---

## 1) File sorgente da seguire (ordine consigliato)

1. `app/(dashboard)/player/profile/page.tsx`  
   Entry route profilo player/staff.
2. `components/profiles/ProfileEditForm.tsx`  
   Form principale web condiviso tra athlete/staff/club/fan.
3. `app/api/profiles/me/route.ts`  
   API GET/PATCH che normalizza e salva i dati su `profiles`.
4. `app/api/profiles/me/experiences/route.ts`  
   Salvataggio esperienze passate (solo player/staff, non club/fan).
5. `lib/server/profileIntegrity.ts`  
   Garanzia riga profilo unica + inferenza tipo account.
6. `CODEX_MOBILE_PARITY_1_1.md`  
   Regole parity globali (staff first-class e compat legacy).

> Regola pratica: **la logica vera è form + API PATCH**. Le schermate devono essere “specchio” del payload reale inviato.

---

## 2) Flusso completo pagina (web)

## 2.1 Load iniziale
1. La pagina renderizza `ProfileEditForm`.
2. `useEffect` iniziale esegue `loadProfile()`.
3. `loadProfile()` fa GET su `/api/profiles/me`.
4. La risposta viene mappata in stato locale (`birthYear`, `country`, `athleteSport`, `athleteRole`, località, social, notifiche, ecc.).
5. Se account è athlete/staff, carica anche esperienze da `/api/profiles/me/experiences`.

## 2.2 Edit campi
- I campi sono controlled inputs React.
- Per `Anno di nascita` il web usa input `type="number"` e stato `number | ''`.
- Cambi località IT aggiornano sia ID entità (`region_id`, `province_id`, `municipality_id`) sia label fallback stringa.

## 2.3 Save
1. Click “Salva profilo” -> `onSubmit`.
2. Si costruisce `basePayload` comune (anagrafica + zona interesse + social + notifiche).
3. Viene applicata una branch di payload per tipo account:
   - `club`: valorizza campi club e **azzera campi athlete**.
   - `fan`: riduce payload a campi minimi e **azzera athlete+club**.
   - `athlete/staff` (ramo PLAYER nel codice): valorizza campi atleta/staff e **azzera campi club**.
4. PATCH su `/api/profiles/me`.
5. Se athlete/staff, PATCH esperienze.
6. Reload profilo e messaggio di successo.

---

## 3) Contratto API PATCH `/api/profiles/me`

## 3.1 Whitelist campi
L’API non salva campi arbitrari: usa una mappa `FIELDS` con tipo (`text|number|bool|json`).

## 3.2 Normalizzazione server
- `text` => trim + `'' -> null`.
- `number` => `Number(value)` se finito, altrimenti `null`.
- `bool` => cast booleano.
- `json` => parse/validate object.
- `country`, `interest_country`, `birth_country` => uppercase ISO-like.
- `sport` => normalizzato.
- sync `full_name`/`display_name` bidirezionale.

## 3.3 Risoluzione label geografiche
Se `interest_country = IT` e arrivano ID territoriali, server risolve `interest_city/province/region` da tabelle geografiche.

## 3.4 Vincoli DB
Dopo normalizzazione, l’update va su `profiles`. Se un campo viola check constraint DB (come `birth_year`), Supabase risponde errore SQL, che il frontend mostra.

---

## 4) Errore attuale su “Anno di nascita” (`profiles_birth_year_check`)

Errore mostrato su mobile:
`new row for relation "profiles" violates check constraint "profiles_birth_year_check"`

Significa che il valore inviato in `birth_year` non soddisfa il check SQL del DB.

## 4.1 Perché può succedere anche se la UI ha min/max
Sul web il campo ha `min=1950` e `max=currentYear-5`, ma:
- HTML min/max **non è sicurezza server-side**,
- mobile può inviare valori fuori range,
- l’utente può lasciare valore non coerente in stato locale,
- differenze di casting tra app mobile/web possono inviare `0`, `NaN` serializzato male, o anno troppo recente.

## 4.2 Regola di parity da replicare (obbligatoria)
Prima della PATCH mobile, per `birth_year` applicare:
- `'' | null | undefined` => `null`
- valore numerico non intero o non finito => `null`
- intero fuori range DB => bloccare submit lato client con messaggio chiaro

In più, mantenere **stesso range del web** a UI (`1950..currentYear-5`) finché non si allinea ufficialmente il check SQL.

---

## 5) Matrice comportamenti per tipo account (fonte verità)

## 5.1 Athlete/Staff (ramo player-like)
Campi attesi in scrittura:
- anagrafica: `full_name`, `display_name`, `avatar_url`, `bio`, `country`
- nascita: `birth_year`, `birth_country`, (`birth_region_id`, `birth_province_id`, `birth_municipality_id`) se IT, altrimenti `birth_place`
- sport/ruolo: `sport`, `role`
- località: `region`, `province`, `city`, e blocco `interest_*`
- social/notifiche: `links`, `notify_email_new_message`
- esperienze passate via endpoint dedicato

Campi da azzerare nel payload:
- tutti i `club_*`.

## 5.2 Club
Campi attesi:
- anagrafica + interesse
- `sport`, `club_*`, località club

Campi da azzerare:
- tutto blocco athlete (`birth_year`, `foot`, `height_cm`, `weight_kg`, `role`, ecc.).

## 5.3 Fan
Campi minimi con forte cleanup:
- anagrafica base + notifiche
- il resto nullo.

---

## 6) Checklist anti-regressione per Codex Mobile

1. **Payload deterministico**: mai inviare chiavi spurie fuori contratto `FIELDS`.
2. **Branch per account_type** identico al web (club/fan/player-like).
3. **Birth year guard doppia**:
   - validazione input UI,
   - validazione prima del submit.
4. **Normalizzazione stringhe**: trim e `'' => null`.
5. **Social links**: stessa logica normalize handle->URL.
6. **Geografia IT**: mantenere ID + label fallback come web.
7. **Gestione errori server**: mostrare `error` raw se presente (utile debugging constraint).
8. **Post-save reload**: dopo PATCH ricaricare profilo (fonte verità server).

---

## 7) Piano pratico di replica 1:1 lato mobile

1. Copiare schema stato locale del form web (naming e default inclusi).
2. Copiare builder `basePayload` + rami tipo account.
3. Copiare normalizzazioni pre-submit (`Number`, trim, nullability).
4. Copiare sequencing salvataggio:
   - PATCH profilo,
   - PATCH esperienze (solo athlete/staff),
   - reload dati.
5. Aggiungere test mobile su casi limite `birth_year`:
   - vuoto,
   - 1949,
   - anno corrente,
   - stringa non numerica,
   - valore valido (es. 1990).

---

## 8) Nota finale per il bug corrente
Per il caso specifico del quarto screenshot, il backend sta correttamente proteggendo la tabella. Il fix va fatto nel client mobile mantenendo la parity web:
- normalizzazione robusta di `birth_year`,
- blocco submit su range invalido,
- fallback a `null` solo quando il campo è realmente non compilato.

Se vuoi allineamento totale e “future-proof”, valuta anche un endpoint di metadata profilo (es. `birth_year_min/max`) così web/mobile leggono limiti dal server e non hardcodano.
