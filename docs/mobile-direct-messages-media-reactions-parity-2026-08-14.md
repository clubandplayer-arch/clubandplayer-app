# Handoff Codex Mobile — parity 1:1 messaggi diretti

Data: 2026-08-14  
Repo sorgente: `clubandplayer-app`  
Branch web: `work`  
Intervallo implementazione: `7df290a..8f90897` (`8f90897` include le rifiniture emoji di `0de56d5`)  
Obiettivo: replicare nella repo mobile **tutto** il comportamento descritto sotto, senza reinterpretazioni.

> Codex Mobile ha accesso in sola lettura a questa repo. Prima di scrivere codice mobile deve leggere integralmente tutti i file elencati nella sezione 2. API, schema e policy sono già implementati lato web/backend: mobile deve consumare gli stessi contratti, non creare endpoint o tabelle parallele.

## 1. Funzionalità web da replicare

### 1.1 Foto

- Il composer consente di scegliere una foto dalla galleria su web/mobile.
- Su mobile espone anche un comando fotocamera posteriore (`capture="environment"` sul web).
- Input accettato dal client: JPEG, PNG, WebP, HEIC/HEIF, massimo 10 MB.
- **Prima dell'upload**, il client ridimensiona il lato lungo a massimo 1920 px e converte in WebP.
- Compressione progressiva con qualità `0.78`, `0.68`, `0.58`, `0.48` fino a massimo 1.500.000 byte.
- Il backend accetta solo `image/webp`, massimo 1.500.000 byte, e verifica magic bytes `RIFF....WEBP`.
- Mostrare anteprima, testo “Sarà ottimizzata automaticamente” e comando rimozione.
- Durante conversione mostrare `Ottimizzo…`; durante invio `Invio…`.
- In chat la foto è contenuta nella vignetta. Tap apre la stessa UX lightbox del feed: overlay nero, immagine `contain` entro 90% viewport, chiusura con tap fuori, pulsante Chiudi e back/Escape. Non aprire browser o URL Supabase.

### 1.2 Emoji nel composer e rendering

- Picker rapido esatto:
  `😀 😃 😄 😁 😂 🥹 😊 😍 😘 😎 🤩 🥳 😢 😭 😡 👍 👏 🙌 🙏 💪 ⚽ 🏀 🏐 🏉 🏆 ❤️ 🧡 💛 💚 💙 💜 🔥 🎉`.
- Tap inserisce l'emoji nel testo corrente.
- Messaggio con **una sola emoji**: grande (`48px` equivalente), senza bordo/sfondo/ombra della vignetta.
- Messaggio con **più sole emoji**: resta nella vignetta, dimensione circa `20px`.
- Messaggio misto testo+emoji: testo standard; solo i token emoji sono circa `20px` e allineati alla baseline.
- Il riconoscimento gestisce variation selector, skin modifier e sequenze ZWJ.

### 1.3 Messaggi vocali

- Registrazione tramite microfono, previo permesso esplicito del sistema.
- Formati preferiti in ordine: `audio/webm;codecs=opus`, `audio/ogg;codecs=opus`, `audio/mp4`.
- Timer visibile; tap sul comando termina la registrazione; stop automatico a 120 secondi.
- File massimo 5.000.000 byte. MIME server ammessi: `audio/webm`, `audio/ogg`, `audio/mp4`, `audio/mpeg`.
- Mostrare errore comprensibile se microfono negato/non supportato, file vuoto o oltre limite.
- Dopo stop mostrare player di anteprima e comando rimozione. In chat mostrare player audio inline.
- Foto e vocale non possono essere inviati insieme; testo può accompagnare entrambi.
- In inbox e notifiche usare `🎤 Messaggio vocale`; per foto senza testo usare `📷 Foto`.

### 1.4 Reazioni ai messaggi

- Accanto a ogni messaggio appare una faccina: al passaggio mouse su desktop, sempre raggiungibile su touch/mobile.
- Tap apre le sei reazioni rapide esatte: `👍 ❤️ 😂 😮 😢 🙏`.
- Un profilo può avere una sola reazione per messaggio.
- Tap su un'altra emoji sostituisce la propria; tap sulla stessa la rimuove.
- Sotto la vignetta mostrare chip aggregati per emoji e conteggio se maggiore di 1.
- Evidenziare il chip contenente la reazione del profilo corrente.
- Le reazioni devono funzionare su testo, emoji, foto e vocali, propri o ricevuti.

## 2. File web fonte di verità

### Modificati

- `components/messaging/DirectMessageThread.tsx`
  - Tutta la UX: picker foto/camera, ottimizzazione, anteprime, lightbox, emoji, MediaRecorder, timer, player, reazioni, dimensionamento emoji, errori persistenti.
- `lib/services/messaging.ts`
  - Tipi `DirectMessage`/`DirectMessageReaction`; `FormData`; metodi reactions; parsing sicuro errori HTML/JSON.
- `app/api/direct-messages/[profileId]/route.ts`
  - GET thread con media/reazioni; POST multipart; validazioni/upload/rollback; fallback schema legacy.
- `app/api/direct-messages/threads/route.ts`
  - Preview `📷 Foto` e `🎤 Messaggio vocale`; fallback colonne non migrate.

### Creati

- `lib/images/compressImageInBrowser.ts` — algoritmo esatto di resize/compressione WebP.
- `app/api/direct-messages/attachment/[messageId]/route.ts` — accesso autenticato foto con signed URL.
- `app/api/direct-messages/voice/[messageId]/route.ts` — accesso autenticato audio con signed URL.
- `app/api/direct-messages/message/[messageId]/reaction/route.ts` — POST upsert e DELETE reazione.
- `supabase/migrations/20260814120000_direct_message_images.sql`
- `supabase/migrations/20260814130000_direct_message_image_policies.sql`
- `supabase/migrations/20260814140000_direct_message_voice_notes.sql`
- `supabase/migrations/20260814150000_direct_message_reactions.sql`

### Componente condiviso riusato

- `components/media/Lightbox.tsx` — comportamento visualizzazione foto da replicare usando il modal/image viewer nativo mobile.

## 3. Contratti API da usare su mobile

### Caricare thread

`GET /api/direct-messages/{peerProfileId}` con autenticazione Bearer già supportata da `withAuth`.

Risposta rilevante:

```json
{
  "ok": true,
  "currentProfileId": "uuid",
  "peer": { "id": "uuid", "display_name": "...", "account_type": "...", "avatar_url": "..." },
  "messages": [{
    "id": "uuid",
    "sender_profile_id": "uuid",
    "recipient_profile_id": "uuid",
    "content": "testo oppure null",
    "attachment_url": "/api/direct-messages/attachment/{messageId}",
    "voice_url": "/api/direct-messages/voice/{messageId}",
    "voice_mime_type": "audio/webm",
    "created_at": "ISO-8601",
    "edited_at": null,
    "reactions": [{ "id": "uuid", "message_id": "uuid", "profile_id": "uuid", "emoji": "❤️", "created_at": "ISO-8601" }]
  }]
}
```

`attachment_url` e `voice_url` sono endpoint applicativi protetti, non URL pubblici permanenti. Mobile deve inviarvi il Bearer token. Se il player nativo non supporta header auth direttamente, effettuare fetch autenticato/redirect resolution o download temporaneo protetto; non rendere pubblico il bucket.

### Inviare

`POST /api/direct-messages/{peerProfileId}` come `multipart/form-data`:

- `content`: stringa, anche vuota;
- `attachment`: opzionale, WebP già ottimizzato;
- `voice`: opzionale, file audio registrato.

Serve almeno uno dei tre. `attachment` e `voice` sono mutuamente esclusivi. Non impostare manualmente il boundary del `Content-Type`.

### Reazioni

- `POST /api/direct-messages/message/{messageId}/reaction`
  - JSON `{ "emoji": "❤️" }`;
  - valori ammessi esclusivamente `👍 ❤️ 😂 😮 😢 🙏`.
- `DELETE /api/direct-messages/message/{messageId}/reaction`
  - rimuove solo la reazione del profilo autenticato.

### Inbox

`GET /api/direct-messages/threads`: mobile deve mostrare `lastMessage` restituito dal server; include già i fallback media.

## 4. Sicurezza e persistenza (non duplicare)

- Bucket `direct-message-images`: privato, WebP-only, limite Storage 3 MB (app 1,5 MB).
- Bucket `direct-message-audio`: privato, limite 5 MB, MIME audio consentiti.
- Signed URL validi 10 minuti; endpoint verifica che profilo corrente sia mittente o destinatario.
- `direct_message_reactions`: unique `(message_id, profile_id)`.
- RLS limita lettura media/reazioni ai partecipanti e scrittura/cancellazione al proprietario.
- Cancellazione/errore DB effettua rollback del file appena caricato.
- Non salvare signed URL in cache persistente: scadono. Conservare l'endpoint applicativo o risolverlo nuovamente.

## 5. Stati UX obbligatori mobile

- `idle`, `optimizingPhoto`, `recording`, `voicePreview`, `sending`, `sendError`.
- Disabilitare invio durante ottimizzazione, registrazione e invio.
- Dopo successo: pulire testo, foto, vocale e file picker; ricaricare thread e scrollare in fondo.
- Dopo errore: mantenere bozza/media per consentire retry e mostrare errore leggibile, mai HTML/JSON grezzo.
- Fermare tutte le tracce microfono quando stop, errore, cambio schermata o unmount.
- Revocare object/blob URL temporanei quando sostituiti o a unmount.
- Polling web: 3 secondi solo con app visibile, più reload a focus. Mobile può usare il proprio lifecycle/realtime, ma deve produrre la stessa freschezza e fermare lavoro in background.

## 6. Compatibilità rollout

- Il web riconosce errori Postgres/PostgREST per colonne media mancanti e ripete le select legacy.
- Se le colonne non esistono, testo continua a funzionare; allegati mostrano errore di aggiornamento DB.
- Se `direct_message_reactions` non esiste, il caricamento chat continua con array reazioni vuoto.
- Mobile deve tollerare campi assenti/null e non deve rendere inutilizzabile una chat testuale.

## 7. Checklist di accettazione parity 1:1

- [ ] Foto galleria e fotocamera funzionano su iOS e Android.
- [ ] Foto >10 MB rifiutata; output WebP <=1,5 MB e lato lungo <=1920.
- [ ] Tap foto apre viewer in-app; tap fuori/back chiude.
- [ ] Picker contiene esattamente emoji/cuori/palloni elencati.
- [ ] Emoji singola, gruppo emoji e testo+emoji rispettano le tre dimensioni.
- [ ] Permesso microfono denied/supportato gestito senza crash.
- [ ] Vocale mostra timer, stop manuale/120s, anteprima, rimozione, invio e player.
- [ ] Audio/foto accessibili solo ai due partecipanti.
- [ ] Reazione aggiunta, sostituita, rimossa e aggregata correttamente da entrambi gli account.
- [ ] Reazioni funzionano su tutti i tipi messaggio.
- [ ] Inbox mostra preview media corretta.
- [ ] Errori conservano la bozza e non mostrano HTML/JSON grezzo.
- [ ] Chat testuale continua a funzionare con payload legacy/campi null.
- [ ] Test incrociato web→mobile e mobile→web per testo, emoji, foto, vocale e reazioni.

## 8. Sequenza consigliata per Codex Mobile

1. Leggere i file della sezione 2 e verificare il networking/auth attuale mobile.
2. Aggiornare modelli DTO in modo nullable e retrocompatibile.
3. Implementare multipart e risoluzione media autenticata.
4. Portare compressione foto usando libreria nativa equivalente con gli stessi limiti/output WebP.
5. Implementare recorder e lifecycle microfono.
6. Implementare viewer, emoji e rendering dimensionale.
7. Implementare reactions con optimistic UI oppure reload, garantendo convergenza col server.
8. Eseguire la checklist completa con due account reali, iOS e Android.
9. Documentare eventuali differenze obbligate dalla piattaforma; nessuna differenza funzionale è accettabile.
