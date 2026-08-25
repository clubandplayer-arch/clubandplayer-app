# FASE 3C-B4 — Profile Edit dual-write — Step 1 preflight

## Stato iniziale e vincoli

**STEP 1 PREFLIGHT TECNICO COMPLETATO; IMPLEMENTAZIONE B4 NON INIZIATA.** B1, B2 e B3 risultano completate; la FASE 3C-B complessiva è **NOT COMPLETED** e B4 è la prossima fase. Questo passaggio è esclusivamente un audit code-only/documentale: nessun form, componente UI, endpoint, salvataggio, migration, RLS, schema o dato Supabase è stato modificato. Non è stato eseguito alcun dual-write, backfill o test mutativo.

Restano vincolanti: canonical-first → Italy legacy mapping → legacy text; nessuna residence derivata dagli `interest_*`; country interests, geo-area interests, `birth_country` e relocation non sono residence; mobile parity è **NOT STARTED**.

## Live canonical read-data gate

**LIVE CANONICAL READ-DATA GATE: PASSED.**

La verifica manuale read-only sulla Preview Vercel collegata a Supabase ha coperto countries IT/FR/ES/CH/SI/PL, root, children, ultimo livello, ancestors, profondità variabile, CH con e senza District, coerenza country/parent e caratteri internazionali. Catene verificate:

| Paese/scenario | Catena reale verificata |
| --- | --- |
| IT | Sicilia → Catania → Catania |
| FR | Île-de-France → Paris → Paris |
| ES | Madrid, Comunidad de → Madrid → Alcalá de Henares |
| CH con District | Ticino → Lugano → Lugano |
| CH senza District | Genève → Genève |
| SI | Osrednjeslovenska → Ljubljana |
| PL | Mazowieckie → Warszawa → Warszawa |

Il gate differito B3 è superato per la sola lettura canonica. In B4 restano da certificare selector collegato al form reale, reset con dati reali, dual-write, salvataggio, rilettura dopo salvataggio, compatibility legacy Italia, privacy e autorizzazioni.

## Classificazione dell'ambiente dati

**POTENTIALLY PRODUCTION — WRITES FORBIDDEN WITHOUT EXPLICIT APPROVAL**

Evidenze non sensibili: `vercel.json` identifica un progetto Supabase per il rewrite dello storage, mentre nel repository non sono presenti metadati environment-scoped che dimostrino un progetto Supabase Preview/Staging distinto. La presenza di una Preview Vercel non prova la separazione del database. Non vengono documentati URL completi, key, token o secret.

Conseguenza: nessun salvataggio di prova, profilo di test, write Supabase o SQL mutativo è autorizzato finché non viene fornita evidenza non sensibile di un ambiente separato oppure approvazione esplicita per un test controllato.

## Inventario e write path attuale

| Ruolo | Entry point | Form/simbolo | Lettura | Scrittura attuale |
| --- | --- | --- | --- | --- |
| Club | `app/(dashboard)/club/profile/page.tsx` | `ProfileEditForm` / `loadProfile` / `onSubmit` | `GET /api/profiles/me` → `profiles.*` | `PATCH /api/profiles/me` → `profiles.update`, fallback `profiles.upsert` |
| Player/Athlete | `app/(dashboard)/player/profile/page.tsx` | `ProfileEditForm` | uguale | uguale |
| Staff | `app/(dashboard)/staff/profile/page.tsx` | `ProfileEditForm` | uguale | uguale |
| Fan | `app/(dashboard)/fan/profile/page.tsx` | `FanProfileForm.onSubmit` | uguale | uguale |
| Institution | `app/institution/profile/page.tsx` | `ProfileEditForm` | uguale | uguale |

`ProfileEditForm` e `FanProfileForm` inviano un singolo payload legacy a `/api/profiles/me`. `LocationFields` usa `location_children()` e assume IT `region → province → municipality`; fuori Italia azzera gli ID e conserva soprattutto testo. `/api/profiles/me` accetta soltanto colonne `profiles`, applica un default implicito `interest_country = 'IT'` quando il campo è assente, risolve label degli interessi IT e poi esegue `profiles.update`; se non trova una riga esegue `profiles.upsert`.

Il GET non carica `profile_preferences`. `SupabaseProfileGeographyRepository.load` offre già la rilettura private canonical-first, ma non è collegato al GET/form. `buildProfileGeographyDualWrite` costruisce payload per `profile_preferences`, `profiles` legacy e interessi, ma non valida né esegue write e attualmente include gli `interest_*`, non i campi legacy `residence_*_id`.

### Rischi confermati del path corrente

1. `interest_country = 'IT'` viene aggiunto dall'endpoint anche in PATCH parziali che non riguardano la geografia: rischio di mutazione implicita e confusione interest/residence.
2. Club/Institution duplicano la sede in `country`, `region/province/city` e `interest_*`; Player/Staff hanno state residence legacy, mentre Fan azzera i campi residence.
3. Il form non legge né scrive `residence_country_id` o `residence_geo_area_id`.
4. Due write Supabase eseguiti separatamente (`profiles` e `profile_preferences`) potrebbero riuscire solo in parte.
5. Il fallback update→upsert può creare la riga profilo prima del write preferences e amplifica il rischio di stato parziale.
6. `country` in `profiles` è descritto/impiegato in più punti come nazionalità o Paese organization: non deve essere reinterpretato automaticamente come residence.
7. Residence personale e sede pubblica di Club/Institution hanno semantica e privacy differenti.

## Piano dual-write proposto

### Contratto in ingresso

Il futuro payload B4 deve avere una sezione tipizzata e opzionale, separata dai campi legacy:

```text
profileId (derivato server-side, mai fidato dal client)
residenceCountryId: UUID | null
residenceGeoAreaId: UUID | null
legacyResidence: valori derivati server-side, non forniti come autorità dal client
```

Assenza della sezione geography significa **non modificare** la residence. Presenza esplicita con entrambi i valori `null` significa reset. `residenceGeoAreaId` non nullo richiede `residenceCountryId` non nullo. Il server deve verificare UUID, country supported/active, esistenza area, stessa country e autorizzazione owner/admin prima di qualsiasi write.

### Canonical → legacy Italia

Per IT il server ricostruisce area e ancestors canonici e consulta `legacy_geo_area_mappings` in direzione canonical → legacy. Scrive soltanto mapping 1:1 verificati e coerenti:

- `residence_region_id`, `residence_province_id`, `residence_municipality_id` secondo il livello selezionato;
- `region`, `province`, `city` con label canoniche corrispondenti, solo dove questi campi rappresentano davvero residence nel ruolo interessato.

Il client non deve inviare ID legacy autorevoli. Nessun `interest_*` viene letto o scritto per derivare la residence.

### Paesi esteri

Per FR, ES, CH, SI e PL i campi canonicali sono autoritativi. Tutti i `residence_*_id` italiani vengono azzerati. Per backward compatibility testuale, `region/province/city` può ricevere una proiezione documentata della catena solo per i ruoli nei quali tali colonne rappresentano residence:

| Paese | `region` | `province` | `city` |
| --- | --- | --- | --- |
| FR | REGION | DEPARTMENT | COMMUNE |
| ES | AUTONOMOUS_COMMUNITY | PROVINCE | MUNICIPALITY |
| CH con District | CANTON | DISTRICT | MUNICIPALITY |
| CH senza District | CANTON | `null` | MUNICIPALITY |
| SI | STATISTICAL_REGION | `null` | MUNICIPALITY |
| PL | VOIVODESHIP | POWIAT | GMINA |

Questa proiezione è fallback testuale, non un secondo modello canonico.

### Reset e cambio Paese

- Reset esplicito: `profile_preferences.residence_country_id = null`, `residence_geo_area_id = null`; azzerare i soli legacy residence pertinenti. Non toccare interests, nationality, birth country o relocation.
- Cambio Paese: azzerare subito nel client il geo-area controllato; il server rifiuta una area della country precedente.
- Country senza area: ammessa soltanto se il prodotto approva una residence country-level; in tal caso country non nulla e area nulla. Altrimenti la UI deve richiedere un'area finale. Decisione aperta.
- PATCH parziale senza geography: nessun default e nessuna mutazione geografica implicita.

## Matrice ruoli proposta

| Ruolo | Selector B4 | Canonical target | Legacy compatibility | Nota/blocco |
| --- | --- | --- | --- | --- |
| Player/Athlete | residence esplicita | `profile_preferences.residence_*` | `profiles.residence_*_id` IT + testo residence | Primo candidato, semantica chiara |
| Staff | residence esplicita | uguale | uguale | Stesso ramo del Player, test separati |
| Fan | residence esplicita solo se approvata dal prodotto | uguale | nessun interest derivato; legacy residence solo se necessario | Privacy elevata; form oggi non espone residence |
| Club | sede canonica | da decidere | attuali `country`, testo e ID IT organization | Non chiamare “residence personale”; manca un campo canonical organization-location dedicato |
| Institution | sede canonica | da decidere | come Club | Stesso blocco semantico del Club |

**Decisione bloccante:** approvare se B4 deve usare `profile_preferences.residence_*` anche come sede canonica di Club/Institution oppure limitare B4 alla residence personale e rinviare la sede organization a un modello canonico dedicato. Il preflight raccomanda la seconda opzione per evitare una semantica falsa.

## Errori, atomicità e rollback

La Supabase JS API non rende atomiche due chiamate separate. Il piano raccomandato è una singola operazione server-side transazionale che:

1. identifica e blocca logicamente il profilo owner;
2. valida canonical country/area e mapping legacy prima dei write;
3. aggiorna `profiles` e fa upsert di `profile_preferences` nella stessa transazione;
4. restituisce il profilo e la geography riletta canonical-first;
5. esegue rollback automatico su qualsiasi errore.

Nel repository non esiste oggi un RPC transazionale per questo flusso. Implementarlo richiederebbe una migration additiva futura oppure una diversa decisione architetturale. Due write sequenziali con compensazione applicativa non sono raccomandati: la compensazione può fallire e non garantisce atomicità. Fino alla decisione, questo è un blocker di implementazione.

Il fallback `profiles.update` → `profiles.upsert` deve essere risolto prima del dual-write: ottenere/creare la riga profilo, poi eseguire una sola transazione geografica. In caso di errore il client mantiene i valori controllati, mostra un errore e non dichiara il salvataggio riuscito. Nessuna modifica locale ottimistica deve sostituire la rilettura server.

## Privacy e RLS

`profile_preferences` è protetta da policy select/insert/update/delete owner-or-admin. Il futuro endpoint deve usare il client Supabase autenticato della request, non service role, e derivare il profile ID dall'utente. Il GET owner/private può includere residence canonica; le API pubbliche non devono acquisirla incidentalmente.

La residence di Player, Staff e Fan è dato personale. Il selector nel form non implica esposizione pubblica. Club/Institution richiedono una decisione separata sulla semantica pubblica della sede. Log, errori e telemetry non devono contenere payload personali completi.

## File previsti per l'implementazione B4

| File | Modifica prevista |
| --- | --- |
| `components/profiles/ProfileEditForm.tsx` | state canonical controllato, selector, payload esplicito, rilettura |
| `components/profiles/FanProfileForm.tsx` | solo se residence Fan approvata; stessa separazione semantica |
| `app/api/profiles/me/route.ts` | contratto owner-only, validazione, rimozione default implicito interest-country, orchestrazione atomica |
| `lib/geo/profileGeography.ts` | completare builder con legacy residence e invarianti partial/reset |
| `lib/geo/profileGeography.server.ts` | riuso canonical-first e mapping; eventuali query batch/reverse mapping |
| `components/geo/CanonicalGeographySelector.tsx` | solo correzioni emerse dall'integrazione, nessun redesign |
| test unit/integration pertinenti | payload, mapping, autorizzazioni, atomicità e regressione |
| eventuale migration RPC additiva | soltanto dopo approvazione esplicita della strategia transazionale |

`LocationFields` deve restare disponibile durante la transizione per compatibilità, senza essere modificato incidentalmente. Signup/onboarding e mobile restano fuori scope.

## Matrice test automatici prevista

| Area | Casi minimi |
| --- | --- |
| Validazione | UUID invalidi, country/area mismatch, area inesistente, country non supported, area root/finale secondo decisione |
| Partial payload | geography assente non muta; reset esplicito; country change azzera area; nessun default IT |
| Italia | mapping canonical→legacy per region/province/municipality; mapping mancante blocca prima dei write; legacy text coerente |
| Estero | FR/ES/CH con e senza District/SI/PL; legacy ID IT azzerati; proiezione testuale corretta |
| Ruoli | Player, Staff e gli account approvati; nessuna contaminazione interest/birth/nationality |
| Atomicità | successo completo; profiles fallisce; preferences fallisce; rollback verificato; nessuno stato parziale |
| Rilettura | canonical-first dopo write; reset restituisce fallback consentito senza ricostruire da interest |
| Auth/RLS | owner consentito; altro utente negato; anonimo negato; admin secondo policy esistente |
| Regression | PATCH non geografica, legacy Italia, fallback update/upsert, form senza preferences preesistenti |

Tutti i test di write devono usare mock/fixture deterministici o un Supabase Preview/Staging dimostrabilmente separato. Nessuna scrittura è consentita nell'ambiente attualmente classificato potentially-production senza approvazione.

## Verifiche manuali/visive previste

Per ciascun ruolo approvato: caricamento initial canonical value, selezione IT/FR/ES/CH con e senza District/SI/PL, cambio Paese, reset discendenti, reset completo, loading/error/retry, salvataggio e rilettura dopo refresh. Verificare desktop/mobile viewport web, tastiera/focus, label, errori server e nessuna esposizione pubblica involontaria.

Il gate manuale B4 deve includere: un caso Italia legacy esistente, un nuovo valore canonicale Italia, almeno un Paese estero, CH nelle due profondità, write fallito senza stato parziale e verifica owner/altro utente. Le scritture richiedono prima un ambiente non-Production dimostrato o approvazione esplicita.

## Suddivisione proposta B4

1. **B4.1 decision gate:** semantica Club/Institution, Fan, country-only, atomicità/RPC e ambiente dati.
2. **B4.2 contract tests:** validazione e builder canonical→legacy, senza UI.
3. **B4.3 transactional server write:** endpoint/RPC owner-only con rollback e read-after-write.
4. **B4.4 Player/Staff integration:** selector controllato, reset e compatibilità IT.
5. **B4.5 remaining approved roles:** Fan e/o organization secondo decisioni.
6. **B4.6 regression and manual gate:** matrice automatica, Preview non-Production, privacy/RLS e read-after-save.
7. **B4.7 documentation/checkpoint:** marcare B4 completata solo dopo tutti i gate.

## Acceptance criteria B4

B4 potrà essere marcata completata soltanto quando: ruoli e semantiche sono approvati; payload parziali non mutano geography; canonical country/area sono validati; write canonicale e legacy sicuro sono atomici; reset/cambio Paese sono corretti; IT e cinque Paesi esteri superano test; read-after-save è canonical-first; nessun interest/birth/nationality diventa residence; privacy/RLS sono verificate; legacy Italia non regredisce; il gate manuale usa un ambiente autorizzato; nessun blocker resta aperto.

## Decisioni approvate dopo il preflight

1. **Ambiente:** resta `POTENTIALLY PRODUCTION — WRITES FORBIDDEN WITHOUT EXPLICIT APPROVAL`; nessun test manuale con write è autorizzato.
2. **Atomicità:** approvata una RPC transazionale additiva come strategia. La migration potrà essere creata in uno step futuro, ma non applicata a Production senza stop e nuova approvazione.
3. **Ruoli:** prima integrazione esclusivamente Player/Athlete e Staff. Club e Institution richiedono un futuro modello organization-location; Fan è rinviato per decisione privacy/prodotto.
4. **Country-only:** approvata con country UUID e geo-area `null`; resta distinta da geography assente e reset esplicito.
5. **Italia:** canonical autoritativa e mapping canonical→legacy 1:1; mai derivare residence dagli `interest_*`.
6. **Estero:** approvata la proiezione testuale country-aware per Player/Staff; legacy ID italiani azzerati.
7. **PATCH parziale:** campo assente significa non modificare; eliminato il default implicito `interest_country = 'IT'`.

## Avanzamento successivo

**B4.2 — Contract tests: COMPLETATO.** Il contratto puro e i test deterministici sono documentati in `docs/european-expansion/phase-3c-b4-profile-residence-write-contracts.md`. Non sono stati collegati UI o write server; non è stata creata/applicata alcuna migration. Prima di iniziare B4.3 occorre mantenere il divieto di write reali e fermarsi nuovamente prima di applicare qualsiasi migration.
