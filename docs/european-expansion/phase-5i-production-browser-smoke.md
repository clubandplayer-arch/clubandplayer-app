# Fase 5I — smoke Production UI e payload

Questo è l'unico smoke mutativo richiesto per chiudere la 5I. Deve essere eseguito su
`https://www.clubandplayer.com` con gli account e i dati di test già concordati. Non
replica migration, deploy, preflight 5G o smoke 5H.

## Gate release

Prima di iniziare, aprire `https://www.clubandplayer.com/api/env` e verificare:

- `mode` uguale a `production`;
- `sha` uguale al commit della correzione 5I promosso dall'operatore (non alla release
  regressiva `94b8f6291223afbd64e7dece3fc954ac9a8221b6`);
- `hasUrl` e `hasAnon` uguali a `true`.

Interrompere lo smoke se uno dei valori non coincide.

## Preparazione DevTools

1. Aprire DevTools → **Network**, attivare **Preserve log** e **Disable cache**.
2. Selezionare il filtro **Fetch/XHR**. Non copiare cookie o header `Authorization`.
3. Per ogni richiesta indicata sotto, conservare status, URL, Request Payload e
   Response. Un semplice replay API non vale come prova: la richiesta deve essere
   generata premendo il controllo della UI.

## Percorso unico

### 1. Catalogo, gerarchia e reset

Aprire `/search`. La richiesta UI `GET /api/sports/catalog` deve rispondere `200` con
`ok: true` e array `sports`, `disciplines`, `variants`.

1. Selezionare Sport A, una sua Discipline A e una Variant A.
2. Cambiare Discipline A con Discipline B: la Variant deve tornare immediatamente
   a “Tutte le varianti”.
3. Selezionare una Variant B, poi cambiare Sport A con Sport B: Discipline e Variant
   devono tornare immediatamente ai rispettivi valori “Tutte”.
4. Tornare allo Sport canonico concordato e, se disponibili, selezionare Discipline
   e Variant concordate per i passaggi successivi.

### 2. Filtri Search e Opportunities

Su `/search`, applicare la selezione canonica dalla UI. La richiesta
`GET /api/search?...` deve essere `200` e contenere `sportId`; se selezionati deve
contenere anche `disciplineId` e `variantId`. Cambiando il padre, i parametri figli
azzerati non devono rimanere nella richiesta successiva.

Aprire `/opportunities` e ripetere la selezione. La richiesta
`GET /api/opportunities?...` deve essere `200` e avere gli stessi parametri canonici.
Il filtro legacy può comparire come `sport`, ma non deve sostituire gli UUID canonici.

### 3. Profile ed Experience — account Player/Staff di test

Accedere con l'account Player/Staff concordato e aprire `/player/profile` oppure
`/staff/profile` secondo il tipo dell'account.

1. Annotare la selezione iniziale, così da poterla ripristinare.
2. Nel Profile scegliere Sport → Discipline → Variant concordati.
3. In una Experience di test compilare stagione, club, ruolo/categoria richiesti e
   scegliere lo stesso percorso canonico.
4. Premere **Salva** una sola volta.
5. In Network verificare:
   - `PATCH /api/profiles/me` → `200`; Request Payload contiene
     `primarySport.canonical.sportId`, `disciplineId`, `variantId` e **non** contiene
     il campo top-level `sport`;
   - `PATCH /api/profiles/me/experiences` → `200`; nell'elemento di test vale lo
     stesso contratto mutuamente esclusivo.
6. Ricaricare la pagina senza replay delle richieste. Profile ed Experience devono
   mostrare nuovamente Sport, Discipline e Variant appena salvati.

Se si verifica intenzionalmente il fallback legacy, il payload deve invece contenere
solo `sport` e non `primarySport`.

### 4. Opportunity — account Club di test

Accedere con l'account Club concordato, aprire `/opportunities/new` e creare una sola
opportunità riconoscibile con il titolo concordato per lo smoke.

1. Selezionare Sport → Discipline → Variant e compilare i campi obbligatori.
2. Premere **Crea** una sola volta.
3. Verificare `POST /api/opportunities` → `201`. Il Request Payload deve contenere
   `primarySport.canonical` con i tre ID (gli ultimi due possono essere `null` solo
   se non selezionati) e non deve contenere `sport` top-level.
4. Aprire l'opportunità creata o la relativa modalità modifica: la UI deve rileggere
   la stessa gerarchia canonica. Salvare una modifica innocua e verificare anche
   `PATCH /api/opportunities/{id}` → `200` con lo stesso contratto payload.
5. Eliminare infine l'opportunità di smoke dalla UI e verificare
   `DELETE /api/opportunities/{id}` → `200`.

## Esito richiesto

La 5I è chiudibile solo con tutti questi risultati nello stesso giro:

```text
PHASE_5I_PRODUCTION_BROWSER_SMOKE_PASS
release=<RELEASE_SHA_CON_FIX_5I>
catalog=200 hierarchy_reset=pass search=200 opportunities_filter=200
profile_patch=200 profile_reread=pass experience_patch=200 experience_reread=pass
opportunity_post=201 opportunity_reread=pass opportunity_patch=200 opportunity_delete=200
payload_contract=primarySport.canonical_exclusive
```

Qualsiasi status diverso, figlio non azzerato, valore non riletto o payload con
`sport` e `primarySport` insieme produce `PHASE_5I_PRODUCTION_BROWSER_SMOKE_STOP` e
la 5I resta aperta. Nei risultati non devono essere inclusi token, cookie o payload
contenenti dati personali non necessari.
