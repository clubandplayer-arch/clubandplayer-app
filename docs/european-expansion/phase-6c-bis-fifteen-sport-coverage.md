# FASE 6C bis — Calcio a 7 e matrice dei 15 sport

**Stato al 2026-09-11:** Preview in corso. Nessuna attivazione Production; 6D non iniziata.

## Decisioni applicate

L'ordine applicativo è: Calcio, Calcio a 8, Calcio a 7, Futsal, Pallavolo (`Volley` nel valore legacy), Pallacanestro (`Basket`), Pallanuoto, Pallamano, Rugby, Hockey su prato, Hockey su ghiaccio, Baseball, Softball, Lacrosse e Football americano. Le label legacy restano i valori persistiti; le traduzioni non sono chiavi.

`Calcio a 7` è la variant canonica `seven_a_side` della disciplina `association_football`. Il mapping e la migration sono additivi e non inventano UUID. La migration è soltanto preparata: va applicata esclusivamente al database Preview dopo preflight.

Nel catalogo review ENTI Italia/Calcio l'ordine parte da LND, Lega Calcio a 8 ed E.I.F.A. FIP è definitivamente la Federazione Italiana Pallacanestro: non è un ente calcistico e sarà valutata nella tranche Basket. ELITE resta soltanto label giovanile LND o parte di nomi ufficiali EIFA, mai organizzatore autonomo.

## Copertura onesta

| Sport UI | Stato 6C | Prossimo riscontro necessario |
|---|---|---|
| Calcio | cataloghi sei Paesi e organizzatori italiani parziali | chiudere i soli gap territoriali già elencati |
| Calcio a 8 | centro Lega: Serie A/A2/B 2026/27; territori incompleti | verificare regolamento gerarchia e singoli portali territoriali |
| Calcio a 7 | sei competizioni portale 2025/26 registrate, non elevate a livelli 2026/27 | distinguere club/rappresentative e reperire stagione corrente |
| Futsal | ricerca Phase 5 disponibile, non consolidata nel nuovo formato | normalizzare per Paese/organizer |
| Pallavolo | ricerca Phase 5 disponibile, non consolidata | federazioni e multisport per Paese |
| Pallacanestro | ricerca Phase 5 disponibile; FIP assegnata a questo sport | catalogare FIP e verificare gli enti multisport |
| Pallanuoto | ricerca Phase 5 parziale | completare Paesi con lacune dichiarate |
| Pallamano | ricerca Phase 5 disponibile, non consolidata | federazioni e multisport per Paese |
| Rugby | ricerca Phase 5 disponibile, non consolidata | separare varianti e circuiti |
| Hockey su prato | ricerca Phase 5 parziale | completare Paesi con lacune dichiarate |
| Hockey su ghiaccio | ricerca Phase 5 disponibile, non consolidata | separare leghe/circuiti omonimi |
| Baseball | ricerca Phase 5 parziale | completare Paesi con lacune dichiarate |
| Softball | ricerca Phase 5 parziale | completare Paesi con lacune dichiarate |
| Lacrosse | ricerca Phase 5 disponibile, non consolidata | verificare livelli e organizer correnti |
| Football americano | ricerca Phase 5 parziale | distinguere tackle/flag e formati |

Questa tabella è un checkpoint, non un catalogo attivabile. Un'assenza di fonte non significa `not_applicable`.

## Lega Calcio a 8

Il review catalog separa le categorie C8 `Serie A`, `Serie A2`, `Serie B` (2026/27) dalle sei competizioni C7 osservate nel 2025/26. `Serie A Renovalo` è conservato come titolo commerciale stagionale della base `Serie A`. Nessuna coppa, finale o girone riceve un rango. Le fonti dirette sono registrate nel JSON senza HTTP status o checksum inventati.

## Compatibilità e rollout

Il web usa lo stesso valore legacy in profili, opportunità, ricerca e registry; ruoli e categorie C7 sono non vuoti. Il client Mobile pubblicato non viene modificato da questa PR e deve aggiungere `Calcio a 7`/`seven_a_side` prima della certificazione di parity. Prima di applicare la migration, verificare che le variabili Preview puntino al progetto Supabase Preview; non eseguire il controllo mostrando segreti nei log.

## Gate Vercel/Supabase Preview — configurazione rilevata il 2026-09-11

Lo scope Vercel `All Environments` su `NEXT_PUBLIC_SUPABASE_URL` significa che, salvo override più specifici, Preview e Production ricevono lo stesso valore. Questo **non certifica un database Preview isolato** e blocca migration, canary e smoke con scritture: una Preview applicativa collegata al project ref Production può modificare dati Production.

Procedura fail-closed per l'operatore Vercel:

1. predisporre un progetto Supabase non-Production oppure un Preview Branch Supabase healthy e annotarne internamente il project ref;
2. in **Vercel → Project → Settings → Environment Variables**, assegnare allo scope **Preview** una coppia coerente del progetto isolato per `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
3. allineare nello stesso scope Preview anche gli equivalenti server realmente configurati (`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`), senza mostrare o copiare i valori in log, issue o PR;
4. mantenere i valori del progetto Production esclusivamente nello scope **Production**; non basta cambiare la sola variabile pubblica;
5. rigenerare un deployment Preview, perché le modifiche alle variabili non cambiano retroattivamente i deployment già creati;
6. verificare dal deployment, mostrando soltanto ambiente e project ref/host (mai le chiavi), che URL browser e server coincidano con Preview e differiscano dal project ref Production;
7. soltanto dopo il PASS applicare al database Preview la singola migration C7 autorizzata ed eseguire lo smoke read/save/reload.

Se non è disponibile un database isolato, lasciare le variabili invariate e fermarsi: sono consentiti soltanto test repository/locali read-only. Non applicare la migration e non eseguire salvataggi dalla Preview. Questa correzione di configurazione non autorizza Production, 6D o le altre migration pendenti.
