# Audit parity Mobile — follower mention, notifiche tag, recupero password

Data: 2026-06-21
Repo sorgente web: `clubandplayer-app`
Branch web di riferimento: `work`
Obiettivo: guidare Codex Mobile nel replicare 1:1 sulla repo mobile le attività implementate nella repo web in questo branch.

## 1. Ambito funzionale implementato sul web

Questo branch ha introdotto tre macro-aree da replicare sulla mobile app:

1. **Recupero password per account email/password**
   - In `/login` è stato aggiunto il link “Password dimenticata?” vicino al campo password.
   - In `/login` è stato aggiunto un box esplicativo “Recupera password” per chi si è registrato con email/password.
   - In `/signup` è stata aggiunta una dicitura per recuperare la password se l’utente aveva già un account email/password.
   - La pagina `/reset-password` precompila l’email da query string, invia la mail di reset Supabase e rimanda a `/update-password`.

2. **Tag follower nei post, eventi e commenti**
   - Sintassi supportata:
     - `@nome` per taggare un follower specifico.
     - `@all` per taggare tutti i follower dell’utenza autrice.
   - Vincolo di sicurezza/funzionale: si taggano **solo i follower dell’autore**, non utenti casuali e non utenti seguiti dall’autore.
   - Il matching normalizza nomi, accenti, spazi e caratteri speciali.
   - Il tag deve funzionare in:
     - post testuali;
     - post con foto/video/link/citazioni;
     - eventi;
     - commenti su post propri;
     - commenti su post/eventi di altre utenze.

3. **UI/UX e notifiche per tag**
   - I tag `@nome` e `@all` appaiono evidenziati in azzurro come link/mention.
   - Nel composer post e nel composer commenti compare una lista follower dopo `@` + almeno 2 lettere.
   - La lista suggerimenti deve stare sempre in primo piano.
   - Le notifiche non devono più mostrare “Nuova notifica”, ma:
     - `Nome utente ti ha taggato in un post`;
     - `Nome utente ti ha taggato in un commento`.
   - Clic/tap sulla notifica deve aprire il post collegato.
   - Il dropdown notifiche web è stato riportato sotto la campanella e messo sopra i contenuti. Su mobile va replicata la stessa priorità visiva per eventuali overlay/pannelli.

---

## 2. File web da leggere prima di implementare su mobile

Codex Mobile deve leggere questi file nella repo web, perché contengono il comportamento sorgente da replicare.

### Recupero password

- `app/login/LoginClient.tsx`
  - Link “Password dimenticata?” accanto al label Password.
  - Box informativo “Hai creato l’account inserendo email e password? Recupera password”.
  - Il link mantiene l’email digitata: `/reset-password?email=...`.

- `app/signup/SignupClient.tsx`
  - Box informativo per utenti già registrati con email/password.
  - Link a `/reset-password`.

- `app/reset-password/page.tsx`
  - Recupera `email` dalla query string.
  - Chiama `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
  - `redirectTo` punta a `${window.location.origin}/update-password`.
  - Testo differenziante: usare questa procedura solo per account email/password; per Google/Apple usare social login.

- `app/update-password/page.tsx`
  - Usa `supabase.auth.updateUser({ password: pwd1 })` per impostare la nuova password dopo link recovery.
  - Validazioni: minimo 8 caratteri, conferma password uguale.

### Tag e mention rendering

- `components/feed/MentionText.tsx`
  - Componente creato in questo branch.
  - Regex sorgente:
    - `/(^|\s)(@(?:all|[\p{L}\p{N}_][\p{L}\p{N}_.-]{0,63}))/giu`
  - Renderizza i token mention con classe azzurra (`text-sky-600`, `font-semibold`).
  - Mobile deve replicare concettualmente lo stesso highlight su testi post/commenti.

- `components/feed/FeedComposer.tsx`
  - Contiene autocomplete follower nel composer post/evento.
  - Funzioni chiave da replicare:
    - `normalizeMentionToken(value)`;
    - `mentionFromName(value)`;
    - `findMentionQuery(value, caret)`;
    - `selectMentionSuggestion(option)`.
  - Stato chiave:
    - `followers`;
    - `caretPosition`;
    - `mentionSuggestions`.
  - Follower lookup:
    - prende l’utente auth corrente;
    - carica il profilo corrente attivo da `profiles` via `user_id`;
    - legge `follows` dove `target_profile_id = profile.id`;
    - join su follower profile con FK `follows_follower_profile_id_fkey`;
    - propone solo follower attivi.
  - Soglia suggerimenti: dopo `@` + almeno 2 caratteri.
  - Inserimento tag: sostituisce il token corrente con `@mention ` e riposiziona il cursore.

- `components/feed/CommentsSection.tsx`
  - Stesso pattern di autocomplete follower nei commenti.
  - Usa `MentionText` per evidenziare i mention nei commenti pubblicati.
  - Il dropdown suggerimenti commenti viene posizionato in primo piano (`fixed` + z-index alto nel web). Mobile deve evitare che lista follower finisca dietro card, keyboard, bottom sheet o modali.

- `components/feed/PostCard.tsx`
  - Usa `MentionText` per renderizzare il contenuto post.

- `components/feed/ReadOnlyPostCard.tsx`
  - Usa `MentionText` per renderizzare post read-only/detail.

- `components/feed/QuotedPostCard.tsx`
  - Usa `MentionText` per contenuti dei post citati/repostati.
  - Mostra autore originale usando `author_profile`, `author_display_name`, `author_avatar_url`.

### API server e notifiche mention

- `app/api/feed/posts/route.ts`
  - Implementa parsing e notifica mention sui post/eventi.
  - Funzioni chiave:
    - `normalizeMentionToken`;
    - `extractMentionTokens`;
    - `profileMentionAliases`;
    - `fetchFollowersForMentions`;
    - `notifyMentionedFollowers`.
  - `@all` notifica tutti i follower dell’autore.
  - `@nome` matcha alias del follower da `display_name` e `full_name`.
  - Inserisce notifiche `kind: 'post_mention'` con payload:
    - `post_id`;
    - `mention: 'all' | 'personal'`;
    - `actor_name`.

- `app/api/feed/comments/route.ts`
  - Implementa parsing e notifica mention sui commenti.
  - Funzioni chiave:
    - `normalizeMentionToken`;
    - `extractMentionTokens`;
    - `profileMentionAliases`;
    - `fetchFollowersForMentions`;
    - `notifyMentionedFollowersInComment`.
  - Inserisce notifiche `kind: 'comment_mention'` con payload:
    - `post_id`;
    - `comment_id`;
    - `mention: 'all' | 'personal'`;
    - `actor_name`;
    - `preview`.
  - Importante: funziona anche quando l’utente commenta un post/evento di un’altra utenza. I destinatari sono sempre i follower dell’autore del commento.

- `components/notifications/NotificationItem.tsx`
  - Mapping UI notifiche:
    - `post_mention` => `${actorName} ti ha taggato in un post`;
    - `comment_mention` => `${actorName} ti ha taggato in un commento`.
  - Routing:
    - entrambe puntano a `/posts/${payload.post_id}`.
  - Mobile deve replicare titolo e deep-link verso dettaglio post.

- `lib/push/sendExpoPush.ts`
  - Aggiunti titoli push per:
    - `post_mention`;
    - `comment_mention`.
  - Aggiunti questi kind alla logica di collapse per post.
  - Mobile deve assicurarsi che la gestione push/deep-link interpreti questi kind.

### Dettaglio post e autore originale

- `app/posts/[id]/page.tsx`
  - Aggiunte funzioni:
    - `fetchAuthorProfileForPost(client, authorId)`;
    - `attachAuthorProfile(row, profile)`.
  - Obiettivo: quando si apre un post da notifica mention, avatar e nome autore devono comparire sia per il post principale sia per il post originale/quotato.
  - Importante: la select profilo corretta usa solo:
    - `id, user_id, full_name, display_name, avatar_url, account_type, type`.
  - Non includere campi non garantiti su `profiles` se possono rompere la query.

### Layering/dropdown

- `components/notifications/NotificationsDropdown.tsx`
  - Il pannello notifiche deve restare sotto la campanella e sopra i contenuti.
  - Web usa `absolute right-0 z-[100001]`.

- `components/shell/AppShell.tsx`
  - Header portato a `z-[100000]` per tenere le notifiche sopra composer/feed.
  - Mobile deve tradurre questa esigenza in overlay/sheet/modal con priorità sopra feed e composer.

---

## 3. Contratti dati da replicare su mobile

### 3.1 Mention token

Regole di tokenizzazione:

- Mention valido:
  - `@all`
  - `@` + lettera/numero/underscore come primo char
  - poi lettere/numeri/underscore/dot/trattino fino a 64 caratteri circa
- Regex web per rendering:
  - `/(^|\s)(@(?:all|[\p{L}\p{N}_][\p{L}\p{N}_.-]{0,63}))/giu`
- Regex web per estrazione backend:
  - `/(^|\s)@([\p{L}\p{N}_][\p{L}\p{N}_.-]{0,63})/gu`

### 3.2 Normalizzazione mention

Mobile deve replicare questa normalizzazione:

```ts
function normalizeMentionToken(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
}
```

Effetti:

- `Gabriele Basso` => `gabrielebasso`
- `Gabriele` => `gabriele`
- Accenti rimossi.
- Spazi e simboli rimossi.

### 3.3 Alias profilo follower

Per ogni follower vanno creati alias da:

- `display_name` completo normalizzato;
- `full_name` completo normalizzato;
- ogni singola parola di `display_name` normalizzata;
- ogni singola parola di `full_name` normalizzata.

Un tag `@nome` matcha se il token normalizzato è uguale a uno degli alias.

### 3.4 Follower lookup

Mobile deve proporre solo follower dell’utente corrente:

1. Leggere utente auth corrente.
2. Leggere profilo attivo da `profiles` con `user_id = auth.user.id`.
3. Leggere `follows` con `target_profile_id = currentProfile.id`.
4. Joinare il profilo follower tramite FK `follows_follower_profile_id_fkey`.
5. Filtrare follower attivi e con nome valido.

Query web concettuale:

```ts
supabase
  .from('follows')
  .select('follower:profiles!follows_follower_profile_id_fkey(id, display_name, full_name, avatar_url, status)')
  .eq('target_profile_id', profile.id)
  .limit(200)
```

### 3.5 Notification kinds e payload

#### Post mention

```ts
kind: 'post_mention'
payload: {
  post_id: string,
  mention: 'all' | 'personal',
  actor_name?: string
}
```

UI title:

```txt
{actorName} ti ha taggato in un post
```

Deep-link:

```txt
/posts/{post_id}
```

#### Comment mention

```ts
kind: 'comment_mention'
payload: {
  post_id: string,
  comment_id: string,
  mention: 'all' | 'personal',
  actor_name: string,
  preview?: string
}
```

UI title:

```txt
{actorName} ti ha taggato in un commento
```

Deep-link:

```txt
/posts/{post_id}
```

---

## 4. Checklist PR consigliata per Codex Mobile

Codex Mobile può trasformare questa sezione in una checklist di PR o task.

### PR 1 — Recupero password email/password

- [ ] Aggiungere in schermata Login un link/CTA “Password dimenticata?” vicino al campo password.
- [ ] Se l’email è già digitata, passarla alla schermata recovery per precompilare il form.
- [ ] Aggiungere in schermata Signup una dicitura “Recupera password” per utenti email/password già registrati.
- [ ] Creare/aggiornare schermata recovery password:
  - [ ] input email;
  - [ ] chiamata Supabase `resetPasswordForEmail`;
  - [ ] messaggio successo “controlla la tua email”;
  - [ ] testo che distingue account email/password da Google/Apple.
- [ ] Creare/aggiornare schermata update password da deep-link recovery:
  - [ ] input nuova password;
  - [ ] conferma password;
  - [ ] validazione min 8 caratteri;
  - [ ] `supabase.auth.updateUser({ password })`.
- [ ] Test manuale:
  - [ ] email vuota/invalid;
  - [ ] email valida;
  - [ ] link recovery apre update password;
  - [ ] nuova password permette login.

### PR 2 — Rendering mention nei testi

- [ ] Portare su mobile una utility equivalente a `MentionText`.
- [ ] Evidenziare `@all` e `@nome` in azzurro/grassetto in:
  - [ ] post nel feed;
  - [ ] dettaglio post;
  - [ ] post citati/repost;
  - [ ] commenti.
- [ ] Assicurarsi che testo normale, emoji e link continuino a renderizzare correttamente.
- [ ] Test manuale:
  - [ ] `@all` all’inizio riga;
  - [ ] `ciao @nome` nel mezzo frase;
  - [ ] più mention nello stesso testo;
  - [ ] mention con accenti/spazi nel nome originale.

### PR 3 — Autocomplete follower nel composer post/evento

- [ ] Implementare lookup follower dell’utente corrente, non following.
- [ ] Mostrare suggerimenti dopo `@` + 2 caratteri.
- [ ] Suggerimenti devono includere:
  - [ ] avatar;
  - [ ] nome visibile;
  - [ ] token `@mention`.
- [ ] Selezione suggerimento inserisce `@mention ` nel testo e riposiziona cursore.
- [ ] Supportare `@all` come token riconosciuto/visivamente evidenziato.
- [ ] Lista suggerimenti sempre in primo piano rispetto a composer, feed, keyboard e modali.
- [ ] Test manuale:
  - [ ] follower presente appare;
  - [ ] utente seguito ma non follower non appare;
  - [ ] utente casuale non appare;
  - [ ] selezione inserisce token corretto;
  - [ ] post con media/link/evento mantiene i tag.

### PR 4 — Autocomplete follower nei commenti

- [ ] Replicare lookup follower nel comment composer.
- [ ] Mostrare suggerimenti dopo `@` + 2 caratteri.
- [ ] Selezione inserisce `@mention ` e mantiene cursore.
- [ ] Evidenziare mention mentre si scrive, se supportato dalla UI mobile.
- [ ] Lista suggerimenti sempre sopra feed/commenti/keyboard.
- [ ] Test manuale:
  - [ ] commento su proprio post con `@nome`;
  - [ ] commento su post di altro utente con `@nome`;
  - [ ] commento su evento club con `@all`;
  - [ ] destinatari sono follower dell’autore del commento.

### PR 5 — Notifiche mention in-app

- [ ] Gestire kind `post_mention` nella lista notifiche mobile.
- [ ] Gestire kind `comment_mention` nella lista notifiche mobile.
- [ ] Titoli esatti:
  - [ ] `{actorName} ti ha taggato in un post`;
  - [ ] `{actorName} ti ha taggato in un commento`.
- [ ] Mostrare preview commento se disponibile per `comment_mention`.
- [ ] Tap notifica apre dettaglio post da `payload.post_id`.
- [ ] Evitare fallback generico “Nuova notifica” per questi kind.
- [ ] Test manuale:
  - [ ] notifica post mention;
  - [ ] notifica comment mention;
  - [ ] deep-link da notifica aperta;
  - [ ] stato letto/non letto.

### PR 6 — Push/deep-link mobile

- [ ] Aggiungere mapping push per `post_mention`.
- [ ] Aggiungere mapping push per `comment_mention`.
- [ ] Titoli push coerenti con web.
- [ ] Collapse/grouping per post id se la mobile app lo gestisce lato client.
- [ ] Tap push apre dettaglio post.
- [ ] Test manuale su device/simulator:
  - [ ] push ricevuta con titolo corretto;
  - [ ] tap apre post;
  - [ ] app chiusa/background/foreground.

### PR 7 — Dettaglio post e autore originale

- [ ] Quando si apre un post da notifica mention, caricare autore del post principale con avatar/nome.
- [ ] Se il post è repost/citazione, caricare autore originale con avatar/nome.
- [ ] Replicare concetto web di `fetchAuthorProfileForPost`:
  - [ ] cerca profilo per `user_id`;
  - [ ] fallback per `id` profilo se necessario;
  - [ ] non includere campi non garantiti nella select.
- [ ] Test manuale:
  - [ ] post normale aperto da notifica;
  - [ ] comment mention su repost;
  - [ ] quoted/original post mostra autore reale;
  - [ ] niente fallback “Autore originale” se il profilo esiste.

### PR 8 — Layering overlay/pannelli

- [ ] Lista suggerimenti mention post sempre sopra contenuti.
- [ ] Lista suggerimenti mention commenti sempre sopra contenuti.
- [ ] Pannello notifiche o notification sheet sempre sopra composer/feed.
- [ ] Se presente header con campanella, pannello deve aprirsi vicino/sotto campanella o come bottom sheet coerente mobile.
- [ ] Test manuale:
  - [ ] feed scrollato;
  - [ ] keyboard aperta;
  - [ ] comment composer vicino a fine viewport;
  - [ ] notification panel sopra feed/composer.

---

## 5. Sequenza di test end-to-end consigliata

1. Creare account A con email/password.
2. Creare account B con email/password.
3. B segue A.
4. A crea post con `@b`.
5. Verificare che B riceva notifica `A ti ha taggato in un post`.
6. B apre notifica e arriva al dettaglio post.
7. Verificare avatar/nome autore post.
8. A crea post con `@all`.
9. Tutti i follower di A ricevono notifica.
10. A commenta un evento di un Club con `@b`.
11. B riceve notifica `A ti ha taggato in un commento` anche se non segue quel Club.
12. B apre notifica e arriva al post/evento.
13. Verificare che mention nel commento sia evidenziato.
14. Testare recupero password:
    - da Login;
    - da Signup;
    - email recovery;
    - update password;
    - login con nuova password.

---

## 6. Note di attenzione per Mobile

- Non proporre utenti globali nella ricerca mention: solo follower dell’autore corrente.
- `@all` non significa tutti gli utenti della piattaforma, ma tutti i follower dell’autore.
- Per i commenti, i follower sono quelli dell’autore del commento, non quelli dell’autore del post commentato.
- Se un nome contiene spazi, il token inserito è normalizzato senza spazi: esempio `Gabriele Basso` => `@gabrielebasso`.
- Evitare query profilo con colonne non certe: sul web `is_verified` in `app/posts/[id]/page.tsx` è stato rimosso perché poteva rompere la hydration autore.
- Le UI overlay devono tenere conto della tastiera mobile; se necessario usare portal/bottom sheet invece di dropdown assoluto.
- Per social login Google/Apple non usare recovery password email/password; guidare l’utente al pulsante social.

---

## 7. Definition of Done mobile parity

La parity mobile può considerarsi completa quando:

- [ ] Login e Signup hanno CTA recovery password.
- [ ] Recovery password email/password funziona end-to-end.
- [ ] `@nome` e `@all` sono supportati in post/eventi/commenti.
- [ ] Autocomplete propone solo follower.
- [ ] Mention renderizzate sono evidenziate in feed, dettaglio e commenti.
- [ ] Notifiche `post_mention` e `comment_mention` hanno copy corretto.
- [ ] Tap su notifica/push apre il post corretto.
- [ ] Post detail mostra sempre autore principale e autore originale/quoted quando disponibili.
- [ ] Overlay suggerimenti e notifiche non finiscono dietro altri componenti.
