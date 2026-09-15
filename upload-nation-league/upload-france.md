# Club and Player — Francia: dilettanti e giovanili

Revisione: 15 settembre 2026. Paese: `FR`. Percorso repo: `upload-nation-league/upload-france.md`.

## 1. Incarico e sostituzione della versione precedente

Implementare il catalogo Francia nel repository web `clubandplayer-app`, sotto il contesto Paese Francia, riutilizzando il modello italiano delle Iscrizioni e le estensioni per Paese già presenti. Questo documento è autosufficiente: non serve l’Excel per l’importazione.

**Questa revisione sostituisce integralmente il vecchio `upload-france.md` e il documento `fase-6-catalogo-francia-istruzioni-codex.md`, che includevano anche professionisti.** Non recuperare categorie da quelle versioni né dalle loro appendici. Non si presume che il vecchio catalogo sia stato implementato: verificare lo stato reale del codice e dei dati locali.

**Solo la sezione 5 è l’elenco da attivare.** La sezione 6 conserva l’audit delle esclusioni e non va importata. Se le categorie escluse sono già presenti, impedirne la nuova selezione nel solo contesto Francia, mantenendo gli identificatori e i riferimenti storici di Club e Opportunity. Il vecchio conteggio di 98 categorie non è più il requisito.

## 2. Criterio di selezione

Richiesta: mantenere dilettanti, amatori e giovanili. Conservare le categorie dilettantistiche d’élite anche quando sono la massima serie di uno sport minore. Escludere le righe professionistiche e, per il perimetro iniziale prudente già usato per la Spagna, quelle semiprofessionistiche o miste, salvo correzioni federali esplicite riportate sotto.

Le verifiche ufficiali sono mirate alle ambiguità, agli organizzatori e alle principali correzioni. Dove non esiste una verifica separata, la natura dilettantistica deriva dalla colonna Natura del file utente. Non si certificano l’assenza di atleti retribuiti o tutti i contratti individuali. Non trasformare questa selezione in un badge «tutti dilettanti» o in un divieto di accesso per persone retribuite. La presenza di una lega in un sito federale conferma il nome o la struttura, non da sola il suo status economico.

Le voci non confermate sono sospese e identificate come tali: **sospeso non significa professionistico**. Non ampliare la lista chiusa senza nuovi dati. Non è necessario ripetere una ricerca generale per implementare le opzioni già definite.


## 3. Riconciliazione

| Misura | Conteggio |
| --- | --- |
| Righe originali Campionati e Categorie | 92 |
| Righe mantenute | 66 |
| Righe escluse o sospese | 26 |
| Categorie normalizzate da attivare | 71 |
| Sport / discipline | 14 |
| Enti distinti | 11 |
| Opzioni Giovanili dopo accorpamento | 2 |

Le righe citate sono quelle dell’Excel originale. Una riga può produrre più categorie, mentre più righe Under confluiscono in Giovanili. Tutte le 92 righe sono riconciliate fra selezione e audit.

## 4. Correzioni e interpretazioni vincolanti

- Calcio: escludere National (anche l’eventuale alias già introdotto Ligue 3), Arkema Première Ligue e Seconde Ligue. Mantenere National 2 e National 3 secondo il perimetro dilettantistico dell’input, senza rinumerare i livelli rimasti. Le etichette del foglio non costituiscono una certificazione delle denominazioni di ogni stagione futura.
- Calcio / FFF: U19, U17 e U19 femminile confluiscono nell’unica voce Giovanili; il vivaio resta ammesso anche quando appartiene a un club con prima squadra professionistica.
- Calcio a 8: Pratique territoriale è una voce generica locale dell’input, non una nuova lega nazionale e non una categoria automaticamente giovanile. Non trasformare il futsal o il calcio a 7 in calcio a 8.
- Futsal: D1 esclusa prudenzialmente dall’attivazione iniziale. La FFF descrive già nel 2022 il percorso di professionalizzazione e l’introduzione del contratto federale [F1]; questo non prova che ogni partecipante sia professionista. D2 e pratica territoriale restano secondo la natura dell’input. Compétition nationale féminine de futsal è una voce generica: non inventare una D1 femminile, un formato o una stagione.
- Pallavolo: oltre alle tre leghe dichiarate professionistiche, escludere Élite Masculine ed Élite Féminine dal perimetro iniziale. I regolamenti FFvolley ammettono contratti professionistici senza limite numerico; quello maschile richiede inoltre quattro giocatori con attività principale per i club che aspirano all’accesso LNV [F2, F3]. La classificazione del foglio «dilettantistico d’élite» non basta qui a selezionare l’intera fascia come dilettantistica. Non si dichiara che tutti i club siano professionistici.
- Pallamano: la riga N1M comprende Poule Élite e gironi di settore con natura mista; sospendere tutta la riga, senza attribuire automaticamente il dilettantismo ai gironi non separati. Rugby Nationale 2 e Pallanuoto Élite maschile/femminile seguono lo stesso criterio prudente sulle righe miste.
- Le altre categorie d’élite dilettantistiche restano quando così classificate nella fonte e senza una correzione documentata qui. Non escludere una categoria solo perché è la massima serie di uno sport minore. La selezione è per competizione, non una verifica dei contratti individuali.
- Hockey su ghiaccio: U20, U18 e U15 confluiscono in Giovanili. Championnat Féminin resta la categoria generica fornita, senza inventare nuove suddivisioni.
- Baseball e Softball sono sport distinti; la riga regionale comune genera una Régionale per ciascuno. Le sigle federali e le categorie omonime sono sempre delimitate da Paese e Sport.
- Le federazioni sotto sono raggruppamenti del catalogo: l’accorpamento delle strutture regionali/dipartimentali non attribuisce tutta la gestione delle gare alla sede nazionale. Niente enti professionistici LFP/LNV/LNB/LNH/LNR come nuove opzioni prive di categorie selezionate.

### Enti di riferimento

| Label breve | Denominazione |
| --- | --- |
| FFF | Fédération Française de Football |
| FFvolley | Fédération Française de Volley |
| FFBB | Fédération Française de BasketBall |
| FFHandball | Fédération Française de Handball |
| FFR | Fédération Française de Rugby |
| FFHG | Fédération Française de Hockey sur Glace |
| FFN | Fédération Française de Natation |
| FFH | Fédération Française de Hockey |
| FFBS | Fédération Française de Baseball et Softball |
| FFFA | Fédération Française de Football Américain |
| France Lacrosse | Association Française de Lacrosse |

## 5. Catalogo attivo — elenco chiuso

Ogni riga è una combinazione valida FR + Sport + Ente + Categoria. Non fare prodotti cartesiani. Usare l’ordine di prima comparsa, con Giovanili in fondo al suo gruppo. Tipo e riferimenti originali sono documentazione, non nuovi campi obbligatori del form.

### Calcio

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| FFF | National 2 | Dilettantistico | 6 |
| FFF | National 3 | Dilettantistico | 7 |
| FFF | Régional 1 (R1) | Dilettantistico | 8 |
| FFF | Régional 2 (R2) | Dilettantistico | 9 |
| FFF | Régional 3 (R3) | Dilettantistico | 10 |
| FFF | District 1 (D1) | Dilettantistico | 11 |
| FFF | District 2 (D2) et niveaux inférieurs | Dilettantistico | 12 |
| FFF | Giovanili | Giovanile | 15, 16, 17 |

### Calcio a 8

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| FFF | Pratique territoriale | Amatoriale | 18 |

### Futsal

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| FFF | D2 Futsal | Dilettantistico | 20 |
| FFF | Compétition nationale féminine de futsal | Dilettantistico | 21 |
| FFF | Régional Futsal | Amatoriale | 22 |
| FFF | District Futsal | Amatoriale | 22 |

### Pallavolo

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| FFvolley | Nationale 2 Masculine | Dilettantistico | 28 |
| FFvolley | Nationale 2 Féminine | Dilettantistico | 29 |
| FFvolley | Nationale 3 Masculine | Dilettantistico | 30 |
| FFvolley | Nationale 3 Féminine | Dilettantistico | 31 |
| FFvolley | Pré-Nationale | Amatoriale | 32 |
| FFvolley | Régionale | Amatoriale | 32 |
| FFvolley | Départementale | Amatoriale | 33 |

### Pallacanestro

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| FFBB | Nationale Masculine 2 (NM2) | Dilettantistico | 37 |
| FFBB | Nationale Masculine 3 (NM3) | Dilettantistico | 38 |
| FFBB | Nationale Féminine 1 (NF1) | Dilettantistico d'Élite | 41 |
| FFBB | Nationale Féminine 2 (NF2) | Dilettantistico | 42 |
| FFBB | Nationale Féminine 3 (NF3) | Dilettantistico | 43 |
| FFBB | Régionale 1 | Amatoriale | 44 |
| FFBB | Régionale 2 | Amatoriale | 44 |
| FFBB | Régionale 3 | Amatoriale | 44 |
| FFBB | Pré-Régionale | Amatoriale | 45 |
| FFBB | Départementale | Amatoriale | 45 |

### Pallamano

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| FFHandball | Nationale 2 Masculine (N2M) | Dilettantistico | 51 |
| FFHandball | Nationale 3 Masculine (N3M) | Dilettantistico | 52 |
| FFHandball | Nationale 1 Féminine (N1F) | Dilettantistico d'Élite | 53 |
| FFHandball | Nationale 2 Féminine (N2F) | Dilettantistico | 54 |
| FFHandball | Nationale 3 Féminine (N3F) | Dilettantistico | 55 |
| FFHandball | Prénationale | Amatoriale | 56 |
| FFHandball | Régionale | Amatoriale | 56 |
| FFHandball | Départementale | Amatoriale | 57 |

### Rugby

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| FFR | Fédérale 1 | Dilettantistico d'Élite | 62 |
| FFR | Fédérale 2 | Dilettantistico | 63 |
| FFR | Fédérale 3 | Dilettantistico | 64 |
| FFR | Élite 1 Féminine | Dilettantistico d'Élite | 65 |
| FFR | Élite 2 Féminine | Dilettantistico | 66 |
| FFR | Fédérale 1 Féminine | Dilettantistico | 67 |
| FFR | Fédérale 2 Féminine | Dilettantistico | 68 |
| FFR | Régionale 1 | Amatoriale | 69 |
| FFR | Régionale 2 | Amatoriale | 70 |
| FFR | Régionale 3 | Amatoriale | 71 |

### Hockey su ghiaccio

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| FFHG | Division 2 | Dilettantistico | 74 |
| FFHG | Division 3 | Dilettantistico | 75 |
| FFHG | Championnat Féminin | Dilettantistico | 76 |
| FFHG | Giovanili | Giovanile | 77, 78, 79 |

### Pallanuoto

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| FFN | Nationale 1 | Dilettantistico | 81 |
| FFN | Nationale 2 | Dilettantistico | 82 |
| FFN | Nationale 3 | Amatoriale | 83 |
| FFN | Régionale | Amatoriale | 83 |

### Hockey su prato

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| FFH | Elite Masculine | Dilettantistico d'Élite | 84 |
| FFH | Elite Féminine | Dilettantistico d'Élite | 84 |
| FFH | Nationale 1 | Dilettantistico | 85 |
| FFH | Nationale 2 | Dilettantistico | 86 |

### Baseball

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| FFBS | Division 1 (Baseball) | Dilettantistico d'Élite | 87 |
| FFBS | Division 2 (Baseball) | Dilettantistico | 88 |
| FFBS | Nationale 1 (Baseball) | Dilettantistico | 89 |
| FFBS | Régionale | Amatoriale | 91 |

### Softball

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| FFBS | Division 1 (Softball) | Dilettantistico | 90 |
| FFBS | Régionale | Amatoriale | 91 |

### Football americano

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| FFFA | Division 1 (Casque de Diamant) | Dilettantistico d'Élite | 92 |
| FFFA | Division 2 (Casque d'Or) | Dilettantistico | 93 |
| FFFA | Division 3 (Casque d'Argent) | Dilettantistico | 94 |
| FFFA | Régionale | Amatoriale | 95 |

### Lacrosse

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| France Lacrosse | Championnat de France de Lacrosse | Amatoriale | 96 |

## 6. Esclusioni — non importare

| Riga originale | Sport | Categoria originale | Motivo |
| --- | --- | --- | --- |
| 5 | Calcio | National | Natura Semi-Professionistico nella fonte: fascia semiprofessionistica o mista esclusa per scelta di perimetro. |
| 13 | Calcio | Arkema Première Ligue | Professionistico nella fonte utente. |
| 14 | Calcio | Seconde Ligue | Natura Semi-Professionistico / Dilettantistico nella fonte: fascia semiprofessionistica o mista esclusa per scelta di perimetro. |
| 19 | Futsal | D1 Futsal | Sospesa per prudenza: percorso di professionalizzazione FFF [F1]; nessuna certificazione di dilettantismo omogeneo. |
| 23 | Volley | Marmara SpikeLigue | Professionistico nella fonte utente. |
| 24 | Volley | Saforelle Power 6 | Professionistico nella fonte utente. |
| 25 | Volley | Ligue B Masculine | Professionistico nella fonte utente. |
| 26 | Volley | Élite Masculine | Esclusa dalla fascia iniziale: coesistenza regolamentata di contratti professionistici e atleti amatori [F2, F3]. |
| 27 | Volley | Élite Féminine | Esclusa dalla fascia iniziale: coesistenza regolamentata di contratti professionistici e atleti amatori [F2, F3]. |
| 34 | Basket | Betclic ÉLITE | Professionistico nella fonte utente. |
| 35 | Basket | ÉLITE 2 (Pro B) | Professionistico nella fonte utente. |
| 36 | Basket | Nationale Masculine 1 (NM1) | Natura Semi-Professionistico nella fonte: fascia semiprofessionistica o mista esclusa per scelta di perimetro. |
| 39 | Basket | La Boulangère Wonderligue | Professionistico nella fonte utente. |
| 40 | Basket | Ligue Féminine 2 (LF2) | Natura Semi-Professionistico nella fonte: fascia semiprofessionistica o mista esclusa per scelta di perimetro. |
| 46 | Pallamano | Liqui Moly StarLigue | Professionistico nella fonte utente. |
| 47 | Pallamano | ProLigue | Professionistico nella fonte utente. |
| 48 | Pallamano | D1F (Ligue Butagaz Énergie) | Professionistico nella fonte utente. |
| 49 | Pallamano | D2F | Natura Semi-Professionistico nella fonte: fascia semiprofessionistica o mista esclusa per scelta di perimetro. |
| 50 | Pallamano | Nationale 1 Masculine (N1M) | Natura Semi-Pro / Dilettantistico nella fonte: fascia semiprofessionistica o mista esclusa per scelta di perimetro. |
| 58 | Rugby | Top 14 | Professionistico nella fonte utente. |
| 59 | Rugby | Pro D2 | Professionistico nella fonte utente. |
| 60 | Rugby | Nationale | Natura Semi-Professionistico nella fonte: fascia semiprofessionistica o mista esclusa per scelta di perimetro. |
| 61 | Rugby | Nationale 2 | Natura Semi-Pro / Dilettantistico nella fonte: fascia semiprofessionistica o mista esclusa per scelta di perimetro. |
| 72 | Hockey su Ghiaccio | Synerglace Ligue Magnus | Professionistico nella fonte utente. |
| 73 | Hockey su Ghiaccio | Division 1 | Natura Semi-Professionistico nella fonte: fascia semiprofessionistica o mista esclusa per scelta di perimetro. |
| 80 | Pallanuoto | Élite Masculine / Féminine | Natura Semi-Pro / Dilettantistico nella fonte: fascia semiprofessionistica o mista esclusa per scelta di perimetro. |

Le esclusioni miste o prudenziali non equivalgono a dichiarazioni di professionismo di tutti gli atleti. Conservare questo audit per eventuali revisioni future, senza renderlo selezionabile.

## 7. Implementazione coerente con l’Italia

- Paese canonico `FR`: filtrare Sport → Ente/Federazione → Categoria usando il contesto Paese esistente. Non ricavarlo dalla lingua, dalla cittadinanza o dal nome di una città; non duplicare il selettore Paese.
- Prima individuare catalogo, seed, migrazioni, helper e flussi reali della repo. Riutilizzare gli ID canonici già presenti e il meccanismo di Iscrizioni multiple del Club. Non creare un catalogo alternativo o una seconda tabella di iscrizioni se la funzione esiste già.
- Sport sinonimi: Basket/Pallacanestro, Volley/Pallavolo, Unihockey/Floorball. Baseball e Softball distinti. Calcio, Calcio a 6, Calcio a 7, Calcio a 8 e Futsal non sono sinonimi. Se un formato selezionato manca, estendere la disciplina/variante con il meccanismo esistente e una label distinta; non mapparlo a Calcio a 8 per comodità. Preservare i valori legacy.
- Un solo Giovanili per combinazione Sport + Ente con dati giovanili ammessi. Collassare Under, Juniores e attività di base nelle combinazioni indicate. Non aggiungere Giovanili a sport privi di righe pertinenti in questo documento. Non eliminare il vivaio di un ente perché la sua prima squadra è professionistica.
- Gestire traduzioni tramite i18n esistente; nomi propri e acronimi rimangono riconoscibili. Gli alias non diventano nuove categorie. Niente sponsor, anni, stagioni, numero squadre o gironi nei nuovi identificatori. Non rinumerare le leghe dopo aver tolto i livelli superiori.
- Il Club può avere più Iscrizioni: anche stesso sport e categorie/enti diversi. Vietare solo i duplicati della combinazione completa. Una sola Iscrizione attiva principale, cambio atomico; tutte le attive visibili nel profilo pubblico con la principale per prima. Header/Dati Club dalla principale.
- Le Opportunity scelgono una Iscrizione attiva appartenente al Club, principale come default. Validare l’appartenenza e la coerenza lato server. Conservare i riferimenti necessari alle Opportunity già pubblicate anche dopo disattivazione dell’Iscrizione.
- Cambio Paese/Sport/Ente: azzerare le scelte dipendenti non più valide. Verificare lato server la combinazione completa; non affidarsi soltanto alle opzioni nascoste in UI.
- RLS e ownership restano attive. Nessun bypass tramite service_role per aggirare il modello. Nessuna riscrittura massiva di profili, Opportunity, esperienze, UUID o dati storici. Se esistono già categorie escluse, limitarne le nuove selezioni preservando riferimenti e visualizzazione storica.
- I fogli territoriali servono come contesto: non creare categorie diverse per regione o dipartimento, né nuovi campi obbligatori. Non importare in blocco le sintesi federali o i loro esempi.
- Scope web: catalogo, Iscrizioni Club, menu Paese e Opportunity. Non riprogettare Mobile, Player, Staff, Fan, Institution o esperienze.
- Usare nuove migrazioni se necessarie, senza modificare quelle già applicate. Completare codice e verifiche locali; non applicare migrazioni remote, non distribuire in produzione e non fare merge/push senza istruzione separata.


- Preservare l’ordine degli enti italiani: LND, Lega Calcio a 8, E.I.F.A., CSI, UISP, CSEN, AICS, OPES, ASC, ENDAS, PGS, US ACLI. Non applicarlo come elenco globale alle altre nazioni.

## 8. Verifiche richieste a Codex

1. Riconciliare esattamente **71 combinazioni** attive, **14 sport**, **11 enti** e **2 Giovanili**. Nessuna delle 26 righe escluse può alimentare nuove opzioni.
2. Verificare che la vecchia selezione professionistica francese non venga ripristinata da altri seed, fallback o documenti. Preservare UUID e riferimenti delle eventuali registrazioni storiche.
3. Verificare isolamento fra FR, IT, ES, CH, SI e PL, categorie omonime, alias sportivi e categorie giovanili.
4. Verificare reset dei dipendenti, combinazioni incoerenti respinte lato server, ownership, Iscrizioni multiple, principale unica e Opportunity storiche.
5. Eseguire lint/typecheck e test mirati disponibili. Provare migrazioni/seed localmente se disponibile; riportare ciò che è stato davvero eseguito e gli eventuali blocchi concreti.

## 9. Fonti e limiti

Fonte X: `Campionati_Dilettantistici_Francia.xlsx`, tutti e tre i fogli letti. SHA-256 originale: `5cb241738aa98b0e80b0f814ef6fd5caa65189211d5c6b9ec6dd15fc07c6b297`. Le classificazioni non corrette esplicitamente derivano dalla colonna Natura del file utente; non sono verifiche autonome su ogni lega o contratto.

| ID | Fonte consultata | Portata della verifica |
| --- | --- | --- |
| F1 | [FFF: Philippe Lafrique, sviluppo della D1 Futsal](https://www.fff.fr/article/6569-philippe-lafrique-on-se-rapproche-des-grands-championnats-europeens-.html) | Articolo dell’11 gennaio 2022: descrive strutturazione e contratto federale come passaggio verso il professionismo. Supporta la scelta prudente; non certifica tutti i contratti del 2026. |
| F2 | [FFvolley: regolamentazione Élite Masculine 2025/26](https://extranet.ffvb.org/data/Files/documents/licences/Elite/FFvolley_DEM_Rappel_Reglementation_2025-26.pdf) | Pagine 1–3: contratti professionistici ammessi e criterio di almeno quattro contratti ad attività principale per aspirare all’accesso LNV. Non è un obbligo esteso indistintamente a ogni squadra. |
| F3 | [FFvolley: regolamentazione Élite Féminine 2025/26](https://extranet.ffvb.org/data/Files/documents/licences/Elite/FFvolley_DEF_Rappel_Reglementation_2025-26.pdf) | Pagina 1: il collettivo ammette giocatrici sotto contratto professionistico senza limite numerico e distingue le attestazioni di amateurisme. Motivo per non importare questa intera fascia nella selezione iniziale. |

I fogli territoriali e di governance sono stati usati solo come contesto. Non aggiungere automaticamente categorie da esempi, elenchi di leghe professionistiche o distretti. Questo documento filtra il materiale fornito: non è un censimento completo di tutto lo sport francese né un aggiornamento integrale dei regolamenti 2026/27.

## 10. Resoconto finale atteso

Elencare file modificati, conteggi per Paese/Sport/Ente, correzioni applicate, test eseguiti e passaggi rimasti. Distinguere implementazione da rilascio. Non effettuare push, merge, migrazioni remote o pubblicazione in produzione nell’ambito di questo incarico.
