# Club and Player scalability runbook

Checklist operativa per verificare che l'app sia pronta a sostenere picchi di iscrizioni, upload e traffico feed/search.

## 1. Variabili ambiente richieste

### Rate limit distribuito

Verificare su Vercel `Project → Settings → Environment Variables` che sia presente almeno una coppia valida:

- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- `UPSTASH_REDIS_REST_KV_REST_API_URL` + `UPSTASH_REDIS_REST_KV_REST_API_TOKEN`
- `KV_REST_API_URL` + `KV_REST_API_TOKEN`
- `REDIS_REST_URL` + `REDIS_REST_TOKEN`

Gli ambienti devono includere almeno `Production`. `Preview` è consigliato.

Dopo ogni modifica alle env, eseguire un redeploy Vercel.

## 2. Smoke test post-deploy

### Avatar upload/rate limit

1. Effettuare login con account test.
2. Caricare un avatar valido.
3. Ripetere più di 5 upload entro 10 minuti.
4. Verificare che il sesto tentativo risponda con HTTP `429` e payload simile a:

```json
{
  "error": "Too Many Requests",
  "retryAfter": "..."
}
```

### Club logo upload

1. Caricare logo PNG/JPEG/WebP valido.
2. Verificare salvataggio e visualizzazione.
3. Facoltativo: provare un formato non supportato e verificare errore `unsupported_format`.

### Feed

1. Aprire `/feed`.
2. Verificare rendering di autori/avatar/media.
3. Verificare post quotati/repost se disponibili.
4. Verificare badge club certificati se disponibili.

### Search/listing

1. Club search: con 1 carattere non deve applicare fuzzy search.
2. Club search: con almeno 2 caratteri deve filtrare.
3. Opportunities: lista e paginazione devono funzionare.
4. Registry club search: cercare con almeno 2 caratteri.

### Notifications

1. Aprire l'app con utente che ha notifiche.
2. Verificare badge campanella.
3. Marcare notifiche come lette.
4. Verificare aggiornamento entro pochi secondi.

## 3. Monitoraggio durante picco

### Vercel

Controllare:

- API function duration p95/p99.
- Error rate 4xx/5xx.
- Numero di `429`.
- Function invocations.
- Bandwidth/egress.
- Log con messaggio:

```text
[rateLimit] distributed store unavailable, falling back to memory
```

Se compare, il rate limiter distribuito non sta usando Redis/KV e sta usando fallback locale.

### Supabase

Controllare:

- Database CPU.
- RAM.
- Connections.
- Slow queries.
- Storage egress.
- Auth errors.
- PostgREST/API latency.

## 4. Query SQL utili

### Duplicati applications

Da eseguire prima di modifiche su vincoli applications o in caso di anomalie:

```sql
select opportunity_id, athlete_id, count(*)
from public.applications
group by opportunity_id, athlete_id
having count(*) > 1;
```

### Volume notifiche unread per utente

```sql
select user_id, count(*) as unread_count
from public.notifications
where read_at is null or read = false
group by user_id
order by unread_count desc
limit 20;
```

### Opportunità recenti

```sql
select id, title, created_at, status
from public.opportunities
order by created_at desc
limit 20;
```

## 5. Rollback rapido

### Rate limit troppo aggressivo

Se utenti legittimi ricevono troppi `429`:

1. aumentare temporaneamente i limiti nel codice;
2. oppure disabilitare temporaneamente Redis/KV solo se strettamente necessario, sapendo che si torna a fallback in-memory;
3. redeployare.

### Upload bloccati

Se upload avatar/logo validi vengono bloccati:

1. verificare MIME effettivo dalla tab Network;
2. se serve, aggiungere il MIME alla allowlist;
3. mantenere comunque un limite dimensione server-side.

### Search/listing anomala

Se paginazione/listing appare errata:

1. verificare `page`, `pageSize`, `hasMore`, `totalIsExact` nella risposta API;
2. controllare se la query ha `q` di almeno 2 caratteri;
3. verificare log API.

## 6. Prossimi step opzionali

Dopo un primo picco reale, valutare in base alle metriche:

- RPC/view per feed più denormalizzato.
- Queue per notifiche/push/email.
- Cache condivisa per search più richieste.
- Upgrade temporaneo Supabase compute durante campagne.
