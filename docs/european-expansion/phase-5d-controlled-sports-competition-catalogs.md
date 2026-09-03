# FASE 5D — Cataloghi e seed controllati

## Checkpoint e azione operatore

> **AZIONE UTENTE ORA: NON applicare migration a Preview o Production.**
>
> Restano non applicate `20261206120000_sports_competition_canonical_schema.sql` (5C) e `20261206130000_sports_competition_controlled_seed.sql` (5D). Il momento di applicazione verrà indicato esplicitamente prima del primo smoke remoto che richieda lo schema, con ordine, preflight, rollback e query di verifica. Non occorre ricordarlo autonomamente.

| Voce | Stato |
| --- | --- |
| Fase / sottofase | **FASE 5D** |
| Stato | **IMPLEMENTATA E TESTATA LOCALMENTE — attende autorizzazione 5E** |
| Migration creata | `20261206130000_sports_competition_controlled_seed.sql` |
| Migration testata | **Sì — PostgreSQL 16.15 locale, doppia applicazione PASS** |
| Migration applicata | **Solo database locale temporaneo; NON Preview/Production** |
| Production interrogata / modificata | **No / No** |
| RLS / grant | Solo nuove mapping table 5D; cataloghi 5C invariati |
| Ownership / Applications | **Non modificati** |
| Web / API | Nessun collegamento runtime |
| Mobile | **NOT STARTED / NON MODIFICATO** |
| Smoke manuale | Non applicabile |

## Perimetro seed autorizzato

La migration registra esclusivamente controlled vocabulary già presente nei payload/UI legacy:

- 3 gender class: `male`, `female`, `mixed`;
- 5 format generici: league, cup, tournament, play-off, friendly;
- 26 ruoli Staff con code inglese stabile e label legacy esatta;
- 95 ruoli Player, associati ai 12 sport attivi rappresentati dalla UI corrente;
- mapping legacy Player/Staff separati dalle identity canoniche.

I code sono wire identity non localizzate; le label italiane sono conservate soltanto come compatibility evidence. Una label condivisa tra sport, come `Portiere`, può risolvere a ruoli distinti grazie alla relazione con `sport_id`.

## Esclusioni deliberate

Non vengono seedati:

- sports organization, federazioni o leghe;
- competition, level, season o group;
- age class nazionali;
- discipline/variant aggiuntive;
- dati profilo, esperienze, Opportunities o Applications.

Questi cataloghi richiedono pacchetti di provenance/licensing e identità fonte approvati. Inventare o copiare una piramide calcistica italiana negli altri Paesi violerebbe il contratto 5B. La loro assenza è fail-closed, non un completamento fittizio.

## Idempotenza e sicurezza

- upsert su code e `(sport_id, code)`;
- mapping legacy aggiornabili senza cambiare gli ID canonici;
- nessuna traduzione scritta nei valori utente;
- nessun backfill e nessun default;
- mapping leggibili solo da authenticated e modificabili tramite policy admin/service role;
- anon può leggere i cataloghi canonici 5C, ma non i mapping compatibility.

## Runtime PostgreSQL

`scripts/test-sports-competition-seed-runtime.sh` crea un database temporaneo, applica 5C, applica 5D due volte, esegue le assertion e distrugge il database.

Verifiche:

1. conteggi esatti 3/5/26/95 e mapping 26/95;
2. idempotenza della seconda applicazione;
3. organization/competition/season ancora vuoti;
4. Opportunity ed esperienza legacy invariati e senza canonical ID;
5. cataloghi leggibili anon;
6. mapping negati anon e leggibili authenticated;
7. nessuna connessione remota.

Esiti finali: test mirati 5D/5C/contract/taxonomy **32/32 PASS**; suite unit completa **303/303 PASS**; PostgreSQL runtime con doppio seed **PASS**; lint, typecheck e `git diff --check` **PASS**. Build eseguita ma non completata perché l'ambiente non ha potuto scaricare i font Google `Inter` e `Righteous`; nessun errore del codice 5D rilevato.

## Rischi residui

- I ruoli Player sono sport-specific; filtri disciplina/variant più fini saranno definiti con dati controllati successivi, non inferiti.
- I cataloghi competition restano vuoti fino a provenance approvata.
- 5C e 5D non sono installate remotamente: API/UI non devono ancora dipenderne.
- Mobile continua a usare i campi legacy e non è stato modificato o certificato.
- Nessun backfill è autorizzato.

## Prossimo passaggio autorizzabile

**FASE 5E — dual-read / dual-write e adapter server**, solo dopo autorizzazione esplicita. Durante 5E gli adapter resteranno inizialmente testabili repository/local-only. Prima di qualsiasi smoke Preview che richieda il database verrà richiesta e descritta esplicitamente l'applicazione ordinata delle migration 5C e 5D.
