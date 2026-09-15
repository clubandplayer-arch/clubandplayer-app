# FASE 6C — Evidence pack e review catalog Calcio IT/FR/ES/CH/SI/PL

Data: **2026-09-11**
Versione artefatti: **v3 — target season 2026/27**
Stato: **REPORT UMANO REGISTRATO / REVIEW CATALOG COMPLETATO CON CANDIDATE ESPLICITE / IMPORT, RUNTIME E PRODUCTION NON AUTORIZZATI**

## Deliverable

- evidence pack: `data/sports/evidence/phase-6c-football-six-country-evidence-pack.json`;
- catalogo revisionabile: `data/sports/phase-6c-football-level-review-catalog.json`;
- test di rischio: `tests/unit/phase-6c-football-evidence-catalog.test.ts`.

Il perimetro è calcio a 11 maschile senior, inclusi i livelli semiprofessionistici necessari a stabilire il rango assoluto. La chiave prodotto resta `country selezionato + sport`, con organizer/territorio obbligatorio quando la categoria non è un'identità nazionale uniforme. Lingua UI, residence e vecchie esperienze non scelgono il catalogo. I nomi nativi non vengono tradotti.

## Provenienza e stati

L'evidence pack v3 mantiene tre piani distinti:

1. `priorRetrievals`: HTTP status e checksum acquisiti prima di questo aggiornamento, conservati senza riscrittura;
2. `handoffSources`: fonti del primo handoff 2026/27, con HTTP/checksum null;
3. `humanReviewReport` e `humanReviewSources`: esito comunicato dall'utente il 2026-09-11, distinto da un retrieval dell'agente e privo di checksum inventati.

Gli stati principali del catalogo distinguono conferma umana, mapping stagionale dedotto, esempio territoriale, template e candidata non confermata. `selectorEligibleAfterReview=true` documenta il superamento della review fattuale della voce, ma non attiva il selector. `importAuthorized=false`, `runtimeAuthorized=false` e `productionAuthorized=false` restano vincolanti.

Tutti i `code` e i code organizer/territorio sono `clubandplayer_internal_review`: non sono UUID o identificatori attribuiti alle federazioni.

## Aggiornamenti registrati per Paese

### Italia

Il product owner conferma senza riserva `Serie D`, `Eccellenza`, `Promozione`, `Prima Categoria`, `Seconda Categoria` e `Terza Categoria`. Sono preservate con ranghi assoluti 4–9 e marcate con provenance `user_confirmation_2026-09-11`. La conferma del product owner resta distinta dalle fonti documentali LND e non viene presentata come retrieval federale dell'agente.

### Francia

Confermata per il 2026/27 la sequenza `Ligue 3` (3), `National 1` (4), `National 2` (5), `Régional 1` (6), `Régional 2` (7), `Régional 3` (8). `Ligue 3 Betclic` è titolo commerciale separato.

Il mapping `National` 2025/26 → `Ligue 3` è esplicito (`ex National`). `National 2` → `National 1` e `National 3` → `National 2` sono registrati come deduzioni dal confronto stagionale, non come rinomine dichiarate. Le tre identità storiche rimangono in `historicalIdentities`; il code corrente `national_2_2026_27` evita il riuso prematuro di `national_2`. `Départemental 1`–`7` restano template con rango null e District obbligatorio.

### Spagna / Catalogna

Confermata la sequenza nazionale `Primera Federación` (3), `Segunda Federación` (4), `Tercera Federación` (5). Non esistono nel catalogo identity nazionali generiche `Preferente`, `Primera` o `Segunda`.

Per `ES-CT` e organizer FCF sono registrate `Lliga Elit` (6), `Primera Catalana` (7), `Segona Catalana` (8), `Tercera Catalana` (9), `Quarta Catalana` (10). Tercera e Quarta sono confermate nel portale 2026/27; i ranghi 9/10 sono classificati come derivati dalla gerarchia del piano FCF, non come numeri stampati dal selector.

### Svizzera

Sono registrate `Promotion League` (3), con `Hoval Promotion League` come titolo commerciale, `1. Liga` (4) e `2. Liga interregional` (5). `1. Liga Classic` è alias documentato dei gironi della stessa 1. Liga. `Cup-Qualifikation 1. Liga Classic` è invece una competizione separata e non è un alias del campionato. `2. Liga`–`5. Liga` restano template con organizer regionale obbligatorio.

### Slovenia

Sono preservate `2. slovenska nogometna liga`/`2. SNL` (2) e `3. slovenska nogometna liga`/`3. SNL` (3).

Fra i sei candidati paralleli del rango 4 risultano confermati:

- `GNL - člani`, con `Gorenjska nogometna liga` come alias di lavoro;
- `Pomurska nogometna liga`;
- `1. Članska Liga`, con `Golgeter Premium liga` come titolo commerciale.

Restano `NON CONFERMATA`: `Regionalna Ljubljanska liga`, `Primorska nogometna liga`, `Superliga MNZ Ptuj`. Lo stato segnala che la prova richiesta non è stata ottenuta, non che la competizione non esista. I generici `Regionalna liga` e `Medobčinska liga` restano esclusi.

### Polonia / DZPN

È preservata `III liga` (4), con `Betclic 3. Liga` come titolo commerciale. Per DZPN/Bassa Slesia sono ora registrate come identity territoriali distinte e confermate:

- `4. Liga dolnośląska` (5);
- `Klasa Okręgowa` (6);
- `Klasa A` (7);
- `Klasa B` (8).

Il precedente code review generico `fourth_liga` è sostituito da `fourth_liga_dzpn` e tracciato in `reviewCodeChanges`. `V liga`, le classi generiche degli altri WZPN e `Klasa C` rimangono template con rango nullo e condizione esplicita.

## Differenze motivate rispetto all'elenco di lavoro

- Le corrispondenze francesi 2025/26 → 2026/27 non condividono automaticamente lo stesso code: solo `National` → `Ligue 3` è una rinomina esplicita; le altre due restano mapping dedotti.
- I ranghi catalani 9/10 sono confermati come derivazione dalla sequenza ufficiale, non come attributi dichiarati dal selector.
- `Classic` resta alias della 1. Liga svizzera, ma la qualificazione di Coppa omonima resta separata.
- Il nome mostrato ufficialmente per la candidata Gorenjska è `GNL - člani`; la denominazione proposta è conservata come alias.
- Le quattro voci polacche confermate diventano record DZPN e non prove valide per ogni WZPN.

## Verifiche residue davvero necessarie

**Nessuna per chiudere la 6C review-only.** Il report umano richiesto è stato ricevuto; non occorre ricontrollare Italia, Francia, Catalogna, Svizzera o DZPN e non viene richiesto alcuno smoke UI/Supabase.

`Regionalna Ljubljanska liga`, `Primorska nogometna liga` e `Superliga MNZ Ptuj` restano candidate slovene non selezionabili perché prive della prova 2026/27 richiesta. Un controllo ulteriore diventerà necessario soltanto se una futura tranche chiederà esplicitamente di promuovere una di queste tre voci; in quel caso il gate richiederà la pagina diretta della competizione sul sito ufficiale dell'organizer competente, nome esatto, stagione e rango. Non è un'attività richiesta ora.

Anche Départemental francesi, associazioni regionali svizzere, `V liga`, altri WZPN e `Klasa C` sono template per tranche territoriali future e non fanno parte di un nuovo incarico implicito.

## Gate finale 6C

6C è **completata per il review catalog e chiusa con candidate non selezionabili esplicite**. Le tre candidate slovene non confermate costituiscono backlog puntuale, non verifiche residue della 6C né un blocco dell'intero catalogo.

6D non è iniziata né autorizzata. La chiusura 6C non concede diritti di importazione e non autorizza migration, seed, API, UI, Mobile, merge su main, deploy o Promote to Production. Tutta la FASE 6 rimane sviluppo/Preview fino a decisione esplicita dell'utente.
