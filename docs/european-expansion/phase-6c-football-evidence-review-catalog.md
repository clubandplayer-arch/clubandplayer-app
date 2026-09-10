# FASE 6C — Evidence pack e review catalog Calcio IT/FR/ES/CH/SI/PL

Data: **2026-09-10**
Versione artefatti: **v2 — target season 2026/27**
Stato: **CATALOGO AGGIORNATO / VERIFICHE MIRATE PENDENTI / IMPORT, RUNTIME E PRODUCTION NON AUTORIZZATI**

## Deliverable

- evidence pack: `data/sports/evidence/phase-6c-football-six-country-evidence-pack.json`;
- catalogo revisionabile: `data/sports/phase-6c-football-level-review-catalog.json`;
- test di contratto: `tests/unit/phase-6c-football-evidence-catalog.test.ts`.

Il catalogo copre il calcio a 11 maschile senior, inclusi i livelli semiprofessionistici necessari a stabilire il rango assoluto, per IT, FR, ES, CH, SI e PL. Registra esclusivamente nomi fattuali necessari alla review del selector: non contiene club, classifiche, calendari, risultati o copie di database federali.

La chiave prodotto rimane `country selezionato + sport`, con organizer/territorio obbligatorio quando una categoria non è un'identità nazionale uniforme. Lingua UI, residence e vecchie esperienze non scelgono il catalogo. `levelRank` è il rango assoluto nella piramide del Paese; una riga territoriale parallela non incrementa il rango di un'altra.

## Classificazioni

- `current_official_source_reported` / `current_official_portal_reported`: il handoff indica una fonte ufficiale 2026/27 pertinente, non una nuova certificazione personale dell'utente;
- `current_structure_reported_mapping_pending`: struttura corrente riscontrata, ma corrispondenza con l'identità storica ancora da determinare;
- `official_territorial_example_only`: evidenza valida soltanto per l'organizer/territorio indicato;
- `territorial_template_unverified`: struttura revisionabile, mai identità nazionale o valore selezionabile;
- `baseline_preserved_current_source_pending`: baseline italiana conservata senza attribuire un nuovo PASS fattuale;
- `selectorEligibleAfterReview=true`: la voce può essere proposta per approvazione, non è già approvata;
- `importAuthorized=false`, `runtimeAuthorized=false` e `productionAuthorized=false`: nessun consumer può usare questi file come catalogo live.

L'evidence pack v2 conserva integralmente i sei retrieval precedenti sotto `priorRetrievals`. Le nuove fonti consegnate per il 2026/27 sono separate sotto `handoffSources`, tutte con HTTP/checksum null e stato `handoff_reported_not_retrieved_in_this_update`: non viene retrodatata alcuna verifica e non viene generato alcun checksum senza acquisizione.

## Aggiornamenti concreti per Paese

### Italia

Preservate `Serie D`, `Eccellenza`, `Promozione`, `Prima Categoria`, `Seconda Categoria` e `Terza Categoria` con ranghi di lavoro 4–9. `Serie D` registra il riferimento LND 2026/27; Eccellenza conserva l'esempio territoriale Sicilia. Le altre voci mantengono esplicitamente la baseline senza un nuovo PASS corrente.

### Francia

La sequenza corrente revisionabile è ora `Ligue 3` (rango 3, titolo commerciale separato `Ligue 3 Betclic`), `National 1` (4), `National 2` (5), `Régional 1` (6), `Régional 2` (7), `Régional 3` (8). Le precedenti identità `national`, `national_2` e `national_3` sono conservate in `historicalIdentities` come evidenza 2025/26: nessun code corrente le riusa prima di avere determinato la corrispondenza temporale. `Départemental 1`–`7` sono template con rango null e organizer District obbligatorio, non sette competizioni francesi universali.

### Spagna

Confermata come struttura di lavoro la sequenza nazionale `Primera Federación` (3), `Segunda Federación` (4), `Tercera Federación` (5). Rimosse le false identità nazionali generiche `Preferente`, `Primera` e `Segunda`. Aggiunte separatamente per `ES-CT` e organizer FCF: `Lliga Elit` (6), `Primera Catalana` (7), `Segona Catalana` (8), `Tercera Catalana` (9), `Quarta Catalana` (10); le ultime due restano secondary-only finché manca la fonte FCF corrente pertinente.

### Svizzera

Registrate `Promotion League` (3), con `Hoval Promotion League` come titolo commerciale separato; `1. Liga` (4), con `1. Liga Classic` solo come alias documentato da ricontrollare; `2. Liga interregional` (5). `2. Liga`–`5. Liga` sono template regionali con organizer SFV/ASF regionale obbligatorio, non identità condivise fra AFV e le altre associazioni.

### Slovenia

Conservate `2. slovenska nogometna liga`/`2. SNL` (2) e `3. slovenska nogometna liga`/`3. SNL` (3). Eliminati i generici `Regionalna liga` e `Medobčinska liga`. Aggiunti come sei candidati paralleli di rango 4, non consecutivi: `Regionalna Ljubljanska liga`, `Gorenjska nogometna liga`, `Primorska nogometna liga`, `Pomurska nogometna liga`, `Superliga MNZ Ptuj`, `1. članska liga MNZ Maribor`.

### Polonia

Conservate `III liga` (4), con `Betclic 3. Liga` come titolo commerciale, e `IV liga` (5), con l'esempio DZPN separato. Aggiunta `V liga` come template opzionale. `Klasa Okręgowa`, `Klasa A`, `Klasa B` e `Klasa C` hanno rango null con due condizioni esplicite: senza V liga occupano rispettivamente 6–9; con V liga 7–10. Nessuna di queste diventa obbligatoria in tutti i WZPN.

## Verifiche umane residue, esclusivamente mirate

Non è richiesto ricercare di nuovo tutti i campionati. Restano soltanto questi controlli, da eseguire in browser normale senza Supabase, credenziali, cookie condivisi, bypass o scraping:

1. **Francia — mapping temporale.** Aprire l'[indice FFF 2026/27](https://www.fff.fr/11-les-reglements/390-les-reglements-des-competitions-nationales.html) e i PDF collegati relativi a Ligue 3, National 1 e National 2. Confermare i tre nomi base, i ranghi 3/4/5 e indicare esplicitamente quale relazione, se presente, abbiano con le identità 2025/26 `National`, `National 2`, `National 3`. Non controllare D1–D7 finché non viene scelto un District concreto.
2. **Spagna — sole due righe catalane.** Dal portale [FCF](https://www.fcf.cat/ca), aprire la competizione 2026/27 di `Tercera Catalana` e `Quarta Catalana`; restituire i due URL diretti e confermare ranghi 9/10. Le tre righe catalane superiori sono già registrate come riscontro del handoff e non richiedono una ricerca nazionale.
3. **Svizzera — identità del quarto livello.** Nel [Match Center SFV/ASF 2026/27](https://matchcenter.football.ch/) aprire la competizione senior uomini del rango 4. Confermare che il nome base sia `1. Liga`, trascrivere l'eventuale titolo commerciale e dire se `1. Liga Classic` è alias della stessa identity o soltanto una dicitura usata in altro contesto.
4. **Slovenia — soli sei candidati di rango 4.** Dal portale [NZS](https://www.nzs.si/) o dalla pagina ufficiale dell'MNZ pertinente, restituire l'URL 2026/27 soltanto per le voci fra le sei elencate che risultano correnti; per le altre scrivere `NON CONFERMATA`. Non cercare generiche “divisioni inferiori MNZ”.
5. **Polonia — variabilità sotto IV liga.** Aprire il [regolamento DZPN 2026/27, §4](https://dzpn.pl/wp-content/uploads/2026/07/Ostateczna_Regulamin-rozgrywek-na-sezon-2026_2027_v1.3.pdf) e confermare soltanto `4. Liga dolnośląska`, `Klasa Okręgowa`, `Klasa A`, `Klasa B`. `V liga` e `Klasa C` rimangono template non selezionabili finché non viene scelto uno specifico WZPN che le preveda.

Formato minimo della risposta:

```text
FR | Ligue 3/National 1/National 2 + mapping storico | PASS/PARTIAL/FAIL | correzioni | URL
ES-CT | Tercera/Quarta Catalana | PASS/PARTIAL/FAIL | correzioni | URL
CH | 1. Liga / 1. Liga Classic | PASS/PARTIAL/FAIL | correzioni | URL
SI | sei candidate regionali | elenco CONFIRMATA/NON CONFERMATA | URL ufficiali disponibili
PL-DZPN | quattro denominazioni §4 | PASS/PARTIAL/FAIL | correzioni | URL
```

## Gate successivo

6C è **implementata documentalmente ma non chiusa fattualmente**: gli aggiornamenti certi e i candidati sono registrati senza bloccare gli altri Paesi. Soltanto dopo i controlli mirati si aggiorneranno gli stati interessati. 6D resta non iniziata e non autorizzata. Anche un PASS fattuale non concede automaticamente diritti di importazione e non autorizza migration, seed, API, UI, merge su main, deploy o Promote to Production.
