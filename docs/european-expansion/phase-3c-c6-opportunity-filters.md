# FASE 3C-C6 — Opportunities canonical geography filters

## Esito

**PASS / COMPLETATA**: implementazione, controlli automatici e smoke test Preview PASS su conferma dell'utente. C7 non è iniziata.

## Contratto implementato

La pagina `/opportunities` riusa `CanonicalGeographySelector`, senza Paese predefinito e con selezione a profondità variabile. Lo stato è persistito nei parametri canonici `countryId` e `geoAreaId`; refresh, navigazione back/forward e condivisione URL mantengono il filtro. Cambiare Paese elimina area e parametri geografici legacy incompatibili; il reset elimina la selezione.

La GET collection accetta anche gli alias snake_case `country_id`/`geo_area_id`. Un filtro Paese seleziona soltanto righe con il medesimo `country_id`. Un filtro area seleziona l'area e tutti i discendenti attivi nello stesso Paese; le Opportunity country-only non appartengono a un sottoambito territoriale e quindi non sono incluse. Country e area sono validate server-side come UUID, supported/active e coerenti. Parametri non validi producono 400.

Per backward compatibility, se nessun parametro canonico è presente, i link legacy `country`/`region`/`province`/`city` continuano a usare le precedenti comparazioni testuali. Se è presente un parametro canonico, questo ha precedenza e i parametri geografici legacy non vengono combinati. Gli altri filtri, ownership, applications, RLS e scritture restano invariati.

## Scope operativo

Nessuna migration nuova o applicata in C6; la C3 risulta applicata su comunicazione utente, senza verifica remota indipendente. Nessuna query o write Production, nessun backfill, nessuna modifica RLS/grants/trigger/RPC, nessuna modifica mobile. Web: filtri canonicali implementati. Mobile: **NOT STARTED / NON MODIFICATO**.

## Verifica manuale Preview richiesta

1. Aprire `/opportunities`: nessun Paese deve essere preselezionato e la lista deve caricarsi.
2. Selezionare un Paese con Opportunity canoniche: URL `countryId`, risultati solo di quel Paese.
3. Selezionare un'area padre con dati nei suoi discendenti: devono apparire sia risultati dell'area sia dei discendenti.
4. Selezionare un livello più profondo; cambiare il Paese e verificare reset dei livelli; usare “Azzera selezione”.
5. Eseguire refresh e back/forward e verificare selezione e risultati stabili.
6. Aprire un vecchio URL con soli `country`/`region`/`province`/`city` e verificare il fallback legacy.
7. Verificare almeno una combinazione geography + sport/ruolo e l'assenza di `[object Object]` o errori console.

Esito comunicato dall'utente: **PASS**. Lo smoke ha verificato che una nuova Opportunity canonica francese viene trovata correttamente. Ha inoltre reso visibile il previsto limite dei dati legacy: una Opportunity italiana priva di `country_id`/`geo_area_id` resta leggibile senza filtro, ma non può soddisfare un filtro canonico basato sugli ID.

## Evidenza legacy e decisione di rollout

L'esempio “Juniores Regionale” conferma che il filtro canonico funziona secondo contratto e che il dataset storico non è ancora canonicalizzato. Non è corretto però eseguire un backfill cieco o fuzzy: le Opportunities storiche hanno soltanto label testuali, che possono contenere codici, alias, differenze linguistiche o combinazioni ambigue.

Prima del rollout definitivo è quindi richiesto un lavoro separato, da autorizzare nella regressione C7 o in un checkpoint dati dedicato:

1. report read-only del totale legacy, dei match deterministici univoci e dei casi mancanti/ambigui;
2. resolver Italia basato su gerarchia completa e mapping legacy verificato, mai sulla sola somiglianza del testo;
3. migration/backfill idempotente che aggiorni esclusivamente righe con match univoco, senza cambiare testi legacy, ownership o applications;
4. fixture, dry-run, conteggi pre/post, rollback e revisione manuale degli scarti;
5. prova su Preview con snapshot realistico prima di qualsiasi applicazione Production.

Il codice e il piano di backfill vanno preparati e testati **prima** del merge. L'applicazione ai dati non deve essere una modifica completa “last minute” immediatamente prima del merge: va eseguita in una finestra controllata soltanto dopo approvazione dei conteggi e con applicazione già dual-read compatibile. I casi ambigui devono restare legacy per correzione manuale, non essere forzati.

## Stato

C6 è **PASS / COMPLETATA**. Prossimo passaggio autorizzabile: **C7 — regressione e backward compatibility**, includendo come blocker di rollout il piano deterministico per i dati legacy; nessun backfill è stato creato o applicato in C6.
