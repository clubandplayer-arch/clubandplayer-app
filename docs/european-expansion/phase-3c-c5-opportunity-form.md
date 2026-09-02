# FASE 3C-C5 — OpportunityForm canonical geography integration

## Esito

**CONDITIONAL PASS — implementazione e test automatici PASS; verifica manuale Preview richiesta.** C5 collega `CanonicalGeographySelector` al form reale di creazione/modifica Opportunity. Poiché la modifica è visibile e abilita write reali, C5 non viene marcata COMPLETATA finché lo smoke controllato indicato sotto non è confermato.

## Implementazione

`OpportunityForm` non usa più:

- catalogo statico `COUNTRIES`;
- default implicito `IT`;
- `location_children()`;
- query dirette `regions`/`provinces`/`municipalities`;
- testo libero estero per region/province/city.

Il form riusa `CanonicalGeographySelector`, già country-aware e hierarchy-aware. Il selector carica esclusivamente countries supported+active e supporta IT, FR, ES, CH con/senza District, SI e PL senza imporre la gerarchia italiana.

La località è opzionale:

- nessuna selezione nuova → payload geography assente;
- solo Paese → `country_id` valorizzato e `geo_area_id=null`;
- area selezionata a qualsiasi livello → entrambi gli ID;
- reset esplicito → entrambi null;
- assenza di interazione durante edit → nessuna modifica geography.

## Compatibilità edit

Per una Opportunity canonica, il form inizializza il selector da `country_id`/`geo_area_id` o dall'oggetto risolto `geography`.

Per una Opportunity legacy priva di canonical IDs:

- mostra la località testuale esistente come avviso;
- non tenta mapping fuzzy o backfill;
- salvare altri campi senza interagire preserva integralmente la località legacy;
- selezionare una località canonica la sostituisce tramite C4 dual-write;
- “Rimuovi” invia un reset esplicito.

Questo evita sia il default Italia sia la cancellazione accidentale dei dati legacy in un edit non geografico.

## Boundary e sicurezza

Il form invia esclusivamente `country_id` e `geo_area_id` quando l'utente ha interagito. Non invia label/ancestors come valori autorevoli. C4 continua a validare server-side e a produrre atomicamente la proiezione legacy.

Nessuna modifica è stata apportata a ownership, Club-only create, owner-only edit/delete, RLS, grants, trigger, applications, applicant semantics, filtri o mobile.

## Test automatici

`tests/unit/opportunity-form-canonical-geography.test.ts` certifica:

- selector canonico riutilizzato;
- assenza di default IT e dipendenze legacy nel form;
- payload field-aware;
- preservation dell'edit legacy non geografico;
- reset legacy esplicito;
- inizializzazione canonical flat/resolved;
- country-only e livelli opzionali;
- selector disabled durante save.

Aggiornato inoltre il test C4 affinché riconosca l'integrazione del selector nella fase successiva. Risultati repository: diff-check, lint, typecheck e **196 unit test PASS, 0 FAIL**. La build raggiunge la compilazione ottimizzata ma resta bloccata dal download esterno dei font Google Inter/Righteous.

## Verifica manuale Preview richiesta

Eseguire con un account **Club** dedicato su una Preview collegata allo schema che contiene la migration C3. Usare Opportunity di test eliminabili e non dati reali indispensabili.

### A. Creazione

1. Aprire `/opportunities/new`.
2. Confermare che nessun Paese sia preselezionato.
3. Selezionare a turno e verificare la cascata per:
   - IT fino a Municipality;
   - FR fino a Commune;
   - CH Municipality sotto Canton senza District, se disponibile;
   - SI fino a Municipality;
   - PL fino a Gmina.
4. Creare una Opportunity country-only e una full canonical.
5. Confermare dopo redirect/refresh che list e detail mostrino la località corretta, senza duplicati o `[object Object]`.

### B. Modifica

1. Riaprire la Opportunity full: selector e livelli devono ricostruire la selezione.
2. Cambiare un livello superiore: i discendenti devono azzerarsi.
3. Salvare e verificare list/detail dopo refresh.
4. Usare “Azzera selezione”, salvare e verificare location assente.

### C. Legacy compatibility

1. Aprire una Opportunity legacy esistente priva di canonical IDs.
2. Verificare l'avviso con il testo legacy.
3. Modificare soltanto titolo/descrizione e salvare: il testo legacy deve restare invariato.
4. Riaprire e sostituire la location con il selector canonico; verificare list/detail.

### D. Cleanup

Eliminare le Opportunity create per lo smoke e verificare che applications/ownership non abbiano subito modifiche inattese.

Comunicare PASS/FAIL per A–D, Paesi effettivamente provati, URL Preview e qualsiasi anomalia. Non includere credenziali o UUID sensibili.

## Stato operativo

| Voce | Stato |
| --- | --- |
| Codice C5 | IMPLEMENTATO |
| Migration nuova | NESSUNA |
| Migration C3 applicata | USER-REPORTED SUCCESS; target non verificato indipendentemente |
| Production | Nessuna query/write eseguita dall'agente |
| Web | OpportunityForm collegato |
| Mobile | NOT STARTED / NON MODIFICATO |
| Test automatici | PASS |
| Verifica manuale Preview | PASS — user-reported |
| Stato C5 | PASS — COMPLETATA |

**Checkpoint successivo:** smoke C5 confermato PASS dall’utente; C6 autorizzata separatamente.
