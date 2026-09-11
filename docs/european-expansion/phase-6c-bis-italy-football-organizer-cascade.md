# FASE 6C bis — Italia: Enti e categorie Calcio a cascata

Data: **2026-09-11**
Stato: **COMPATIBILITY/REVIEW CATALOG COMPLETATO — IMPLEMENTAZIONE RUNTIME NON INIZIATA**

## Decisione

La richiesta è compatibile con il modello europeo se viene rappresentata come cascata condizionale:

```text
Paese esplicito del contesto → Sport → Ente/organizzatore (se necessario) → opzione dell'Ente (se presente)
```

Per l'Italia e il Calcio esistono più organizzatori realmente selezionabili, quindi il menu Ente è necessario. In un altro Paese con un solo organizzatore applicabile, l'organizzatore può essere selezionato automaticamente e il menu ridondante omesso. Se l'organizzatore non espone ulteriori opzioni, anche il terzo menu viene omesso. La lingua UI non modifica i nomi ufficiali.

Questa regola allinea l'Italia agli altri Paesi senza imporre ovunque tre menu vuoti. Il catalogo review-only è `data/sports/phase-6c-bis-italy-football-organizer-review-catalog.json`.

## Trasformazione del menu italiano

Il menu piatto Calcio attuale mescola livelli LND, organizzatori e categorie ombrello. Il piano futuro è:

1. mantenere Sport come primo selector;
2. rimuovere tutte le voci dal menu piatto: spostare i primi sei livelli sotto LND e `E.I.F.A.`, CSI, UISP, CSEN, AICS/AiCS, OPES, ASC, ENDAS, PGS, US ACLI e FIP nel selector Ente;
3. aggiungere LND come primo Ente;
4. non creare ELITE come Ente;
5. dopo la scelta dell'Ente, mostrare soltanto le opzioni appartenenti a quell'organizzatore.

LND espone, in quest'ordine: Serie D, Eccellenza, Promozione, Prima Categoria, Seconda Categoria, Terza Categoria, ELITE, Giovanili. I primi sei sono livelli con rango assoluto 4–9. `ELITE` è una label di campionato giovanile esclusiva LND e `Giovanili` è un'umbrella UX: non sono livelli senior e non ricevono un `levelRank` inventato.

Le competizioni EIFA che contengono legittimamente “Elite” conservano il proprio nome completo; la regola vieta soltanto di propagare la voce generica `ELITE` agli altri organizzatori.

## Enti e opzioni censite

| Ente | Trattamento 6C bis |
| --- | --- |
| LND | sei livelli senior + ELITE giovanile + Giovanili |
| E.I.F.A. | Serie A d’Elite “Lorenzo Cesari”; Campionato Challenge Elite; Super Champions Elite |
| CSI | Campionato Nazionale Open; esempio Milano separato: Eccellenza, Open A, Campionato Master |
| UISP | Campionato Nazionale calcio a 11; Coppa Nazionale; Trofeo Adriatico |
| CSEN | Finali Nazionali Calcio CSEN – settore A11; nessuna Serie A/B/C dedotta |
| AiCS | Campionato nazionale calcio a 11; Over 40 a 7 escluso |
| OPES | Torneo Eurosport Amatori di Calcio a 11 |
| ASC | due opzioni Calabria, territorialmente scoped |
| ENDAS | campionato storico 2017, non selezionabile come corrente 2026/27 |
| PGS | Under 14/15/16/17/19, Open, Masters, Don Bosco Cup; nessun Under 13 o inferiore |
| US ACLI | campionato calcio a 11 e Coppa Clerici, scoped a Milano |
| FIP | placeholder non selezionabile: la Federazione Italiana Pallacanestro non è un organizer del calcio a 11; serve un nome diverso se la sigla indica altro |

Le fonti comunicate dall'utente sono conservate nel catalogo come `user_supplied_not_agent_retrieved`, con HTTP e checksum null. Non vengono presentate come nuova certificazione automatica.

## Compatibilità con lo schema europeo

La foundation esistente supporta già:

- organizzazioni tramite `sports_organizations` e `sports_organization_countries`;
- livelli tramite `competition_levels`;
- competizioni e tornei tramite `competitions`/`competition_editions`;
- classi d'età tramite `age_classes`;
- territorialità tramite country e geo-area.

Non tutte le opzioni del terzo menu sono però un `competition_level`: coppe, tornei, finali, age class e `Giovanili` hanno semantiche differenti. Una futura implementazione non deve inserirle tutte in `competition_levels`. Il contratto di lettura dovrà restituire una union tipizzata (`competition_level`, `competition`, `cup`, `tournament`, `age_category`, `youth_umbrella`) oppure separare i relativi selector.

## Cosa comporterà una futura implementazione

Questa 6C bis non autorizza i passaggi seguenti, ma ne identifica l'impatto:

1. materializzare soltanto organizzazioni e opzioni approvate, preservando organizer/territorio/stagione;
2. definire un read contract country+sport per gli organizzatori e un read contract organization+sport per le opzioni;
3. introdurre riferimenti canonici additivi nei soli domini che devono salvarli, mantenendo dual-read legacy;
4. collegare il selector Club e poi Opportunities, senza cambiare le esperienze Player/Staff;
5. al cambio Sport/Paese/Ente, azzerare soltanto valori non più applicabili;
6. mostrare i menu secondo cardinalità: più Enti → mostra Ente; uno → auto-select/hide; zero opzioni → nascondi terzo menu;
7. mantenere le denominazioni native indipendenti dalla lingua UI;
8. eseguire regressione Italia e poi la stessa semantica condizionale sui cataloghi esteri.

La struttura dati esistente rende quindi l'opzione possibile, ma il campo legacy singolo `club_league_category` non può rappresentare in modo affidabile Sport + Ente + tipo di opzione. Il futuro collegamento richiederà un contratto additivo e probabilmente riferimenti canonici distinti; la decisione sarà parte di una fase successiva autorizzata, non di 6C bis.

## Gate e controlli umani

Non è richiesto alcun controllo umano generale né uno smoke UI/Supabase: questa tranche non modifica il runtime.

Resta un solo chiarimento necessario prima di rendere FIP selezionabile: indicare il nome completo dell'organizzazione intesa con `FIP` se non è la Federazione Italiana Pallacanestro. Fino ad allora FIP resta visibile soltanto nel review catalog come placeholder non selezionabile e senza opzioni.

ENDAS resta non selezionabile per il 2026/27 finché non viene fornita una fonte corrente. Questo non blocca gli altri Enti.

6C bis è chiusa per audit, compatibilità e review catalog. Non avvia 6D, non modifica `lib/opps/categories.ts`, form o API e non autorizza migration, seed, backfill, RLS, Mobile, merge su main, deploy o Production.
