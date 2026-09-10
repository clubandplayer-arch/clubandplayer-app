# FASE 6A — Audit repository-only dei modelli profilo per account type

Data audit: 2026-09-10  
Perimetro: repository Web/API corrente; nessuna interrogazione Preview/Production  
Stato: **COMPLETATA — AUDIT REPOSITORY-ONLY / NESSUNA MODIFICA RUNTIME**

## 1. Scopo e boundary

La 6A fotografa il modello effettivo di Club, Athlete/Player, Staff, Fan e Institution
prima di definire il contratto funzionale della FASE 6. Sono stati letti migration,
API, form, onboarding, completion/visibility, profili pubblici, geografia, tassonomia
sportiva, esperienze e test. Admin è stato considerato soltanto come boundary di
sicurezza: non è un profilo europeo di prodotto da completare in FASE 6.

Questa attività non introduce feature, migration, seed, backfill, query remote,
modifiche RLS, UI, API, Mobile o dati. Le evidenze Production già certificate nelle
Fasi 3–5 non vengono ripetute né reinterpretate.

## 2. Baseline comune verificata

### 2.1 Identità e onboarding

- I cinque account type ammessi dal flusso utente sono `institution`, `club`,
  `athlete`, `staff` e `fan`; l'endpoint di onboarding accetta esclusivamente
  `account_type` e rinvia deliberatamente geografia e completamento ai flussi profilo.
- `account_type` è la discriminante corrente, ma persistono consumer del fallback
  storico `type`. La route `/api/profiles/me` sincronizza `type` soltanto quando il
  PATCH contiene `account_type`; l'endpoint onboarding aggiorna invece il solo
  `account_type`. La coesistenza è quindi ancora un contratto di compatibility da
  preservare e chiarire, non da rimuovere incidentalmente.
- Signup crea l'identità senza raccogliere Paese, sport o dati specifici; la scelta
  ruolo indirizza ai form successivi. Non esiste un onboarding progressivo tipizzato
  oltre la scelta dell'account type.

### 2.2 Geografia, lingua e mobility

- La foundation canonica vive in `profile_preferences` (`preferred_language_id`,
  `residence_country_id`, `residence_geo_area_id`, `open_to_relocation`) e nelle
  relazioni `profile_country_interests` e `profile_geo_area_interests`; le policy sono
  own-or-admin.
- Residence canonica e UI mobility sono intenzionalmente abilitate soltanto per
  Athlete e Staff. Club e Institution continuano a usare `profiles.country/region/
  province/city` come sede pubblica; Fan usa campi legacy di interesse.
- Residenza personale, sede pubblica di un'organizzazione, nazionalità, luogo di
  nascita, interessi country/area e relocation sono semantiche distinte. Nessun
  contratto 6B può riutilizzare una di esse come prova automatica di un'altra.
- La lingua preferita è una preferenza comune owner-scoped, ma non fa parte della
  shape TypeScript principale del profilo né del PATCH generico del profilo.

### 2.3 Sport ed esperienze

- `profiles` contiene il primary sport legacy `sport` e la catena canonica nullable
  `sport_id → sport_discipline_id → sport_variant_id`, con FK e shape check. Questo è
  un singolo primary sport, non un modello multi-sport.
- Athlete e Staff condividono `athlete_experiences` e la RPC replacement atomica;
  ogni esperienza può avere la stessa catena sportiva canonica e conserva i testi
  legacy. Il nome della tabella è storico e non esprime il boundary Staff.
- Non esistono relazioni profilo verso sports organization, competition, level,
  group, age class o season. `club_league_category` e `athlete_experiences.category`
  restano stringhe legacy; la season delle esperienze è rappresentata da anni.
- Position Player e staff role rimangono nel campo testuale condiviso `role` sul
  profilo; i cataloghi canonici introdotti in FASE 5 non sono collegati al profilo.

### 2.4 Write path e pubblicazione

- `PATCH /api/profiles/me` usa una allowlist globale di campi. Applica alcune
  normalizzazioni specifiche a Institution, Club e persone, ma non rifiuta in modo
  sistematico tutti i campi non applicabili all'account type effettivo.
- `ProfileEditForm` costruisce payload differenti e azzera molti campi dell'altro
  ruolo. Questo limita lo stale state nella UI corrente, ma affida al client una parte
  delle invarianti: un client alternativo può inviare combinazioni non pertinenti.
- Il trigger database di visibility e la funzione TypeScript di completion non sono
  perfettamente equivalenti: Institution richiede un nome nel trigger ma nessun campo
  nel helper; Club include anche moderazione del nome nel trigger; gli altri requisiti
  sono ancora basati su stringhe legacy (`country`, `sport`, `role`).
- Il profilo pubblico comune espone campi personali come anno di nascita, altezza,
  peso, piede e interessi legacy senza una projection esplicitamente distinta per
  account type. La FASE 6 deve definire prima il contratto privacy, poi cambiare le
  projection.

## 3. Matrice per account type

Legenda: **C** canonico collegato; **L** legacy/testuale; **P** parziale; **N/A** non
applicabile secondo il comportamento corrente; **M** mancante o da decidere.

| Area | Athlete / Player | Staff | Club | Institution | Fan |
| --- | --- | --- | --- | --- | --- |
| Entry Profile Edit | shared `ProfileEditForm` | shared `ProfileEditForm` | shared form + registry/verification | shared form, pagina separata | `FanProfileForm` dedicato |
| Nome/completion | richiesto | richiesto | richiesto + moderation | incoerente helper/DB | richiesto |
| Nazionalità `country` | L, richiesta | L, richiesta | usata come Paese sede | usata come Paese sede | L opzionale |
| Residence canonica | C, feature-gated | C, feature-gated | N/A: serve contratto sede | N/A: serve contratto sede | M/decisione privacy |
| Nascita | IT IDs + fallback estero | stesso form Athlete | N/A | N/A | azzerata |
| Primary sport | C+L, singolo | C+L, singolo | C+L, singolo | azzerato dal form | N/A |
| Position / staff role | L in `role` | L in `role` | ruolo forzato `Club` | ruolo forzato `Ente` | N/A |
| Esperienze | C+L, replacement | C+L, replacement | M | M/N/A da decidere | N/A |
| Organization/competition | M | M | M; categoria L | M | N/A |
| Multi-sport | M | M | M, relazione dedicata necessaria | M/N/A | N/A |
| Country/area interests | C in Settings + L nel form | C in Settings + L nel form | sede duplicata nei campi `interest_*` | sede duplicata nei campi `interest_*` | solo L nel form |
| Relocation | C | C | N/A corrente | N/A corrente | N/A corrente |
| Preferred language | C, comune | C, comune | C, comune | C, comune | C, comune |
| Sede/venue | N/A personale | N/A personale | L + coordinate | L + coordinate nei campi Club | N/A |
| Public projection | generica, da minimizzare | generica, da minimizzare | pagine dedicate/parziali | pagina dedicata/parziale | generica/parziale |

## 4. Gap specifici

### 4.1 Athlete / Player

**Disponibile:** anagrafica, nascita legacy/IT, residence canonica, mobility canonica,
primary sport canonico, ruolo legacy, esperienze canonical-first, misure fisiche,
skills e social.

**Gap:** posizione canonica non collegata; competition/level/age class mancanti;
primary sport singolo; doppio modello interessi legacy/canonico visibile in superfici
diverse; completion ancora legacy; nessuna classificazione privacy campo per campo.

### 4.2 Staff

**Disponibile:** quasi tutto il flusso Athlete, primary sport e mobility inclusi, con
lista ruoli Staff e percorso dedicato.

**Gap:** campi fisici e di nascita del form Athlete sono condivisi senza contratto
esplicito di applicabilità; staff role non è canonico; esperienze risiedono nella
tabella `athlete_experiences`; mancano discipline/organizzazioni/competition history
tipizzate e distinzione fra professioni trasversali e ruoli specifici di uno sport.

### 4.3 Club

**Disponibile:** nome con moderation/registry, primary sport, categoria testuale,
anno fondazione, impianto, indirizzo, coordinate, sede testuale e verifica Club.

**Gap:** modello single-sport; nessuna relazione a organization/competition/level/
season; categoria italiana testuale; sede internazionale non usa ancora un contratto
canonico da organizzazione; `interest_*` è riutilizzato come duplicato della sede;
completion impone region/province/city secondo una gerarchia italiana; mancano
separazione Club/venue e regole multi-sede.

### 4.4 Institution / Ente

**Disponibile:** account type, nome organizzazione, dati generici, campi sede/impianto
riusati dal form Club e pagina dedicata.

**Gap critico:** l'helper TypeScript considera ogni Institution completa, mentre il
trigger database richiede almeno il nome; non esiste un modello funzionale che
distingua federazione, lega, ente promozionale, scuola o altra istituzione; i campi
con prefisso `club_*` sono riusati semanticamente; sport viene azzerato; organization,
territorial scope, discipline e competizioni non sono collegati; la pagina contiene
copy italiano hardcoded.

### 4.5 Fan

**Disponibile:** form dedicato, nome, nazionalità testuale e un interesse geografico
legacy; il profilo non richiede sport o dati professionali.

**Gap:** Fan è escluso correttamente dalle API mobility canoniche, ma il form conserva
un singolo interesse nel vecchio modello italiano/testuale; manca una decisione di
prodotto se un Fan debba poter seguire più Paesi/aree senza acquisire relocation o
residenza professionale; profilo pubblico e consumer non hanno una projection Fan
formalizzata.

## 5. Gap trasversali ordinati per rischio

| Priorità | Gap | Rischio se si implementa senza contratto |
| --- | --- | --- |
| P0 | Completion TypeScript, trigger DB e UI divergenti | profilo indicato completo in una superficie e draft in un'altra |
| P0 | PATCH con allowlist globale, non field policy per account type | client alternativo può scrivere campi non applicabili o distruttivi |
| P0 | Privacy/public projection non tipizzata per ruolo | esposizione di residenza o dati personali non necessari |
| P0 | Sede Club/Institution confusa con residence/interests | ranking, Maps e filtri semanticamente errati |
| P1 | Club multi-sport e legami competition mancanti | uso improprio di stringhe/array in `profiles` e redesign successivo |
| P1 | Position/staff role non canonici | matching incoerente con Opportunities FASE 5 |
| P1 | Fan legacy interests vs mobility canonica Athlete/Staff | UX e ranking divergenti senza decisione di prodotto |
| P1 | `account_type` / `type` e route profilo non uniformi | redirect o consumer legacy divergenti |
| P2 | Tipi TypeScript incompleti rispetto alle colonne runtime | uso diffuso di cast e `any`, regressioni non intercettate |
| P2 | Copy/path Institution e Staff non uniformi | regressioni i18n e access control difficili da certificare |

## 6. Decisioni richieste prima dell'implementazione

La successiva 6B deve essere un **contratto funzionale e privacy**, non una migration.
Richiede approvazione umana esplicita almeno su:

1. quali sottotipi di Institution sono supportati;
2. se Club è multi-sport e con quale nozione di primary sport;
3. se Athlete e Staff possono avere più sport oltre alle esperienze;
4. differenza fra posizione Player e professione/ruolo Staff;
5. quali legami organization/competition appartengono a Profile, Club o Experience;
6. modello di sede Club/Institution: una o più venue e precisione pubblica;
7. campi obbligatori per pubblicazione per ciascun account type;
8. classificazione `owner-only`, `public`, `matching-only` per ogni dato geografico e
   personale;
9. se Fan debba avere interessi canonici multipli, senza relocation;
10. strategia di compatibility per `type`, stringhe legacy e client Mobile pubblicati.

## 7. Piano progressivo proposto per la FASE 6

- **6B — contratto account-type e privacy:** matrice target, cardinalità,
  obbligatorietà, visibilità e compatibility; nessuna migration.
- **6C — gap/schema design:** mapping logico-fisico e piano additivo, con decisione
  multi-sport, role/position, organization/competition e venue.
- **6D — schema e RLS locali:** migration additive testate su PostgreSQL locale,
  nessun backfill/apply remoto.
- **6E — contratti server:** read/write per account type, canonical-first, fallback e
  projection privacy-safe.
- **6F — UI e onboarding:** tranche separate Athlete, Staff, Club, Institution e Fan.
- **6G — consumer pubblici:** profili, card, Search/Discover/WhoToFollow, feed e Maps,
  senza anticipare matching avanzato FASE 7/8.
- **6H — rollout controllato:** preflight, apply/deploy autorizzati separatamente,
  canary disposable e teardown.
- **6I — regressione/certificazione:** cinque account type, sei Paesi, legacy Italia,
  privacy/RLS, vecchi/nuovi client e smoke Web.

Le lettere sono una proposta vincolante soltanto dopo review della 6B. Non è
autorizzato creare schema o runtime partendo direttamente da questo audit.

## 8. Verifiche automatiche e remote

L'audit è documentale. Sono richiesti `git diff --check`, test unitari, lint e
typecheck per dimostrare che la documentazione non accompagni regressioni repository.
Build, PostgreSQL runtime, browser screenshot, query Supabase e smoke Preview/
Production non sono necessari perché nessun file eseguibile è stato modificato.

## 9. Verifiche umane

**Nessuno smoke UI umano è richiesto per chiudere la 6A:** non è cambiato alcun
comportamento percepibile. Non bisogna creare account, salvare profili o interrogare
Production per validare questo audit.

È invece richiesta una **review di prodotto/architettura prima di autorizzare 6B**.
La persona incaricata deve leggere le dieci decisioni della sezione 6 e confermare,
correggere o rinviare ciascun punto. In particolare deve evitare approvazioni generiche
come “tutti i campi per tutti”: per ogni account type va dichiarato cosa è applicabile,
pubblico, privato, di matching e obbligatorio. Questa è una decisione umana, non uno
smoke tecnico, e non autorizza migration o write remoti.

## 10. Stato finale

FASE 6A **COMPLETATA** nel solo perimetro repository-only. Schema, API, UI, RLS,
Preview, Production e Mobile non sono stati modificati. Prossimo passaggio sicuro:
**FASE 6B — contratto funzionale per account type e privacy**, previa autorizzazione
esplicita e review delle decisioni aperte.
