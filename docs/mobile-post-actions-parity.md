# Mobile Feed: parity azioni post proprietario (Modifica / Elimina / Condividi)

## Obiettivo
Portare l'app mobile in **parity 1:1** con il comportamento web per i post del feed:
- se il post è dell'utente loggato, mostrare 3 azioni: **modifica**, **elimina**, **condividi**;
- se il post non è dell'utente loggato, mostrare solo **condividi**.

Questo allinea la UX mobile al comportamento già attivo lato web in `PostCard`.

## Comportamento di riferimento (web)
Nel componente web `components/feed/PostCard.tsx`:
- la ownership è derivata con `isOwner = currentUserId != null && post.authorId === currentUserId`;
- le azioni **edit** e **delete** sono renderizzate solo se `isOwner` è true;
- l'azione **share** è sempre renderizzata;
- edit usa `PATCH /api/feed/posts/:id` con body `{ content }`;
- delete usa `DELETE /api/feed/posts/:id` con conferma utente;
- share crea/riusa link con `createPostShareLink(post.id)` e apre share nativa su mobile (`navigator.share`) quando disponibile, altrimenti fallback modal.

## Specifica funzionale per Codex Mobile

### 1) Gating azioni (regola unica)
Implementare una funzione unica e riutilizzabile, ad esempio:
- `canEditDelete(post, currentUserId): boolean`
- logica: `Boolean(currentUserId) && post.authorId === currentUserId`

Usare **questa stessa regola** in ogni punto UI (card feed, dettaglio post, eventuale menu overflow).

### 2) UI: sostituire "Condividi" testuale con 3 icone coerenti al web
Nel blocco azioni header della card post:
- se owner: mostrare icone **matita (edit)**, **cestino (delete)**, **share**;
- se non owner: mostrare solo **share**.

Linee guida UI/UX:
- touch target minimo 44x44;
- `accessibilityLabel`/`contentDescription` espliciti:
  - "Modifica questo post"
  - "Elimina questo post"
  - "Condividi questo post"
- stato disabilitato durante request (`saving`/`shareLoading`);
- feedback visivo su tap/press (opacity/ripple);
- mantenere ordine icone web: **edit → delete → share**.

### 3) Modifica post (edit)
Flusso consigliato:
1. tap su edit;
2. apertura composer/modal precompilato con testo corrente;
3. validazione base (trim, max length già in uso lato mobile);
4. submit `PATCH /api/feed/posts/:id` con payload `{ content: trimmedText }`;
5. su successo:
   - aggiornare item localmente (optimistic patch o replace con response),
   - chiudere editor,
   - toast "Post aggiornato".
6. su errore: rollback stato locale + toast errore.

Note di sicurezza:
- non permettere edit di post non owner anche se l'utente forza la UI (il backend comunque deve già validare);
- centralizzare il client API (`updatePost(postId, content)`) per evitare divergenze.

### 4) Elimina post (delete)
Flusso consigliato:
1. tap su delete;
2. mostrare confirm dialog distruttivo;
3. submit `DELETE /api/feed/posts/:id`;
4. su successo:
   - rimuovere post dalla lista locale,
   - toast "Post eliminato".
5. su errore: mantenere post visibile + toast errore.

Best practice:
- impedire doppio tap mentre request in corso;
- se feed paginato/infinite scroll, aggiornare count/cache in modo consistente.

### 5) Condivisione post (share)
Mantenere comportamento già presente, ma in forma icona:
- riusare endpoint/funzione attuale per generare link condivisibile;
- aprire share sheet nativo (iOS/Android);
- fallback a copia link se share sheet non disponibile.

### 6) Stato locale e cache (per non rompere niente)
Per evitare regressioni:
- introdurre azioni come layer sottile sopra il data model esistente;
- riusare reducer/store/query keys già usati dal feed;
- preferire helper centrali:
  - `patchPostInFeed(postId, patch)`
  - `removePostFromFeed(postId)`
- coprire i punti multipli dove il post appare (feed home, profilo utente, dettaglio post) per evitare stato incoerente.

### 7) Compatibilità e rollout sicuro
Raccomandato:
- feature flag `mobile_feed_owner_actions_v1`;
- rollout graduale (QA interno -> % utenti -> 100%);
- logging analytics eventi:
  - `post_edit_tap`, `post_edit_success`, `post_edit_error`
  - `post_delete_tap`, `post_delete_confirm`, `post_delete_success`, `post_delete_error`
  - `post_share_tap`

## Piano tecnico minimale (ordine di implementazione)
1. estrarre utility ownership `isPostOwner(post, currentUserId)`;
2. refactor UI actions card con 3 icon button condizionali;
3. integrare handler edit con endpoint PATCH;
4. integrare handler delete con confirm + endpoint DELETE;
5. mantenere/riusare share handler attuale;
6. aggiornare cache/store post-edit/delete;
7. aggiungere test.

## Test plan (obbligatorio)

### Unit
- owner true -> azioni visibili: edit/delete/share;
- owner false -> visibile solo share;
- tap edit -> chiama PATCH con payload corretto;
- tap delete + confirm -> chiama DELETE;
- delete cancel -> nessuna call.

### Integration/UI
- post aggiornato visibile immediatamente dopo edit;
- post rimosso dalla lista dopo delete;
- errore API mostra feedback utente senza rompere il feed.

### Regression checklist
- nessuna regressione su reazioni/commenti;
- nessuna regressione su card non-owner;
- share continua a funzionare su Android/iOS;
- accessibilità: focus order e label corrette.

## Criteri di accettazione
- Mobile replica comportamento web delle azioni post owner in modo consistente;
- Icone e permessi sono coerenti al web (owner: 3 azioni, non owner: share);
- Nessun impatto negativo su rendering feed, commenti, reazioni e condivisione.
