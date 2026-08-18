# Parity mobile 1:1: presenza chat e ricevute di lettura

Questo documento è il contratto di integrazione per Codex Mobile. La repo mobile può leggere il codice web, ma deve usare lo stesso backend e rispettare esattamente i comportamenti descritti qui.

## Risultato UX da replicare

Nella testata della conversazione, sotto il nome dell'interlocutore:

- pallino e testo verdi `Online` quando il peer è presente;
- pallino e testo grigi `Offline` quando il peer non è presente;
- stato neutro `Verifica presenza…` soltanto durante la sincronizzazione iniziale, per evitare il lampeggio falso `Offline` → `Online`.

Sotto **l'ultimo messaggio della conversazione**, soltanto se è stato inviato dal profilo corrente:

- `Letto` in verde se `peerLastReadAt >= message.created_at`;
- `Non letto` in grigio negli altri casi;
- nessuna ricevuta sui messaggi ricevuti o sui messaggi inviati precedenti.

Le date devono essere confrontate come timestamp, non come stringhe formattate/localizzate.

## Backend condiviso già implementato dal web

### Migration Supabase

Il web ha creato `supabase/migrations/20260818120000_profile_presence_and_read_receipts.sql`.
La migration crea:

- `public.profile_presence(profile_id uuid primary key, last_seen_at timestamptz)`;
- indice su `last_seen_at`;
- RLS: lettura per utenti autenticati; insert/update soltanto per il profilo appartenente a `auth.uid()`.

La tabella `direct_message_read_state` esisteva già ed è aggiornata dall'endpoint mark-read. **Mobile non deve creare tabelle parallele né scrivere direttamente stati di lettura incompatibili.** Se web e mobile puntano allo stesso progetto Supabase, la migration va applicata una sola volta dal normale processo backend.

### Heartbeat autenticato

Endpoint:

```http
POST /api/presence/heartbeat
Cookie/Authorization: sessione Supabase valida
```

Risposta di successo:

```json
{
  "ok": true,
  "lastSeenAt": "2026-08-18T19:12:00.000Z",
  "profileId": "uuid-del-profilo-attivo"
}
```

L'endpoint risolve sul server il profilo attivo dell'utente autenticato e fa upsert di `profile_presence` con conflitto su `profile_id`. Il client non invia un profile ID arbitrario.

Mobile deve:

1. inviare subito l'heartbeat quando si avvia una sessione autenticata;
2. ripeterlo ogni 30 secondi mentre l'app è attiva/foreground;
3. inviarlo quando l'app torna in foreground;
4. usare il `profileId` restituito come chiave della propria Supabase Realtime Presence;
5. non considerare un errore Realtime come errore bloccante: il database resta il fallback.

### Payload della conversazione

Endpoint:

```http
GET /api/direct-messages/:peerProfileId
```

Oltre a `messages`, `peer` e `currentProfileId`, restituisce:

```json
{
  "peerOnline": true,
  "peerLastReadAt": "2026-08-18T19:12:00.000Z"
}
```

I due valori possono essere:

- `peerOnline`: `true`, `false` oppure `null` quando il fallback non è determinabile;
- `peerLastReadAt`: timestamp ISO oppure `null`.

Il fallback server considera online un profilo con heartbeat negli ultimi **75 secondi**. Questo valore assorbe ritardi di rete rispetto all'heartbeat ogni 30 secondi. Dopo la prima sincronizzazione Realtime, il client non deve sovrascrivere il valore Realtime con `peerOnline` proveniente dal polling HTTP: farlo causerebbe falsi passaggi Online/Offline.

### Marcatura come letto

Endpoint:

```http
POST /api/direct-messages/:peerProfileId/mark-read
```

Aggiorna con upsert la coppia:

- `owner_profile_id`: profilo corrente;
- `other_profile_id`: interlocutore;
- `last_read_at`: timestamp server corrente.

Mobile deve chiamarlo:

1. quando apre una conversazione;
2. quando riceve un nuovo messaggio del peer mentre quella conversazione è visibile;
3. quando torna in foreground con la conversazione visibile.

Per evitare chiamate duplicate, memorizzare localmente l'ID dell'ultimo messaggio entrante già marcato. Resettare il valore quando cambia `peerProfileId`. Dopo il successo, aggiornare i badge/inbox locali.

## Supabase Realtime Presence: contratto esatto

Usare lo stesso progetto Supabase e il topic:

```text
app-online-presence
```

Il client autenticato deve aprire **un solo canale Presence condiviso per tutta l'app**, configurato così:

```ts
supabase.channel('app-online-presence', {
  config: { presence: { key: currentProfileId } },
})
```

Dopo lo stato `SUBSCRIBED`, tracciare:

```json
{
  "profileId": "current-profile-uuid",
  "onlineAt": "timestamp-ISO"
}
```

Ascoltare gli eventi `sync`, `join` e `leave`. A ogni evento, leggere l'intero `presenceState()`. Un peer è online se:

- esiste una chiave uguale al suo `profileId` con almeno una presenza; oppure
- almeno un elemento dello stato contiene `profileId` uguale al suo ID.

Il doppio controllo rende mobile compatibile sia con la chiave Presence sia con il payload tracciato dal web.

### Vincolo fondamentale: singleton

Non aprire un canale `app-online-presence` nel componente di ogni chat. Il web aveva inizialmente questa implementazione e i canali duplicati sullo stesso client/topic si sostituivano o interferivano: due utenti attivi risultavano entrambi `Offline`.

Mobile deve avere un singleton/service a livello applicazione che:

- possiede l'unico canale;
- conserva il set corrente degli UUID online;
- permette alle schermate chat di sottoscriversi al set;
- consegna immediatamente l'ultimo set noto ai nuovi subscriber;
- ritraccia la presenza dopo una riconnessione `SUBSCRIBED`;
- rimuove il canale al logout/chiusura della sessione;
- non chiude il canale quando si smonta soltanto una schermata chat.

Il riferimento web è `lib/presence/realtimePresence.ts`. L'avvio applicativo è in `components/shell/AppShell.tsx`; la chat è solo subscriber in `components/messaging/DirectMessageThread.tsx`.

## Algoritmo mobile consigliato

### Service applicativo presenza

Stato mantenuto:

```ts
channel: RealtimeChannel | null
trackedProfileId: string | null
onlineProfileIds: Set<string> | null
listeners: Set<(ids: ReadonlySet<string>) => void>
```

Flusso:

1. heartbeat → ricevi `currentProfileId`;
2. se esiste già un canale per lo stesso profilo, riusalo;
3. altrimenti apri l'unico canale con quel profile ID come key;
4. su `SUBSCRIBED`, chiama `track`;
5. su `sync`, `join`, `leave`, ricostruisci completamente il set e notificane i listener;
6. una schermata chat usa `onlineProfileIds.has(peerProfileId)`;
7. prima del primo set Realtime usa `peerOnline` HTTP se non è `null`; altrimenti mostra `Verifica presenza…`;
8. dopo il primo set Realtime ignora il fallback HTTP finché il canale resta operativo.

### Ricevuta di lettura

Dopo ogni refresh dei messaggi:

```ts
const last = messages[messages.length - 1]
const showReceipt = last?.sender_profile_id === currentProfileId
const read = showReceipt && peerLastReadAt != null &&
  Date.parse(peerLastReadAt) >= Date.parse(last.created_at)
```

Visualizzare la ricevuta solo sotto `last`. Il polling/refresh successivo deve aggiornare `peerLastReadAt`, così `Non letto` passa a `Letto` senza riaprire la conversazione.

## File web da usare come fonte di verità

- `supabase/migrations/20260818120000_profile_presence_and_read_receipts.sql`: schema e RLS.
- `app/api/presence/heartbeat/route.ts`: heartbeat autenticato.
- `app/api/direct-messages/[profileId]/route.ts`: fallback presenza e read state del peer.
- `app/api/direct-messages/[profileId]/mark-read/route.ts`: upsert del cursore di lettura.
- `lib/presence/realtimePresence.ts`: singleton Realtime e fan-out ai subscriber.
- `components/shell/AppShell.tsx`: lifecycle heartbeat/foreground/sessione.
- `lib/services/messaging.ts`: parsing del contratto API.
- `components/messaging/DirectMessageThread.tsx`: regole UI e confronto timestamp.

## Checklist di accettazione parity 1:1

Testare con due account reali A e B:

1. A e B aprono l'app: entrambi vedono l'altro `Online` senza attendere il polling HTTP.
2. A naviga fuori e dentro la chat: il canale globale resta attivo e B rimane `Online`.
3. A invia a B: A vede `Non letto` sotto l'ultimo messaggio.
4. B apre la chat: il client chiama mark-read; al refresh A vede `Letto`.
5. B riceve un altro messaggio con la chat già visibile: viene marcato senza riaprire la schermata.
6. B effettua logout/chiude la sessione: l'evento `leave` porta A a `Offline`.
7. Realtime non disponibile: il valore API basato su heartbeat continua a fornire un fallback senza crash.
8. Navigazione ripetuta tra chat diverse non crea canali Presence aggiuntivi.
9. Più dispositivi dello stesso profilo: il profilo resta online finché almeno una presenza con quell'ID rimane attiva.
10. `peerOnline: null` non viene interpretato automaticamente come `false` durante la sincronizzazione iniziale.
