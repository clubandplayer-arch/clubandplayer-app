# FASE 5J — regressione, backward compatibility e certificazione finale

## Scopo e baseline accettata

La 5J è un unico gate di certificazione, non una nuova fase funzionale. Non introduce
feature, migration, seed, backfill, modifiche RLS o nuovi cataloghi.

La baseline Production già accettata e da non ripetere è:

- release `d69768bb2df05bb8fb7ead409cba83e806b4c76b` in modalità Production;
- `PHASE_5I_PRODUCTION_PASS` per selector unico, cascata ruolo/categoria, filtri e
  salvataggio/rilettura Profile, Experience e Opportunity;
- catalogo con 12 Sport canonici e 14 opzioni applicative legacy;
- audit migration history con `classification=PASS`, `transactionReadOnly=on`,
  `writesPerformed=false`, cinque versioni mirate registrate una volta e nessun
  oggetto schema mancante.

Queste evidenze chiudono 5I e il controllo migration/history. Non rieseguire migration,
seed, backfill, history repair, canary 5F/5G o smoke mutativi 5I.

## Gate 1 — certificazione repository automatica

Eseguire una volta sola dalla root:

```bash
bash scripts/verify-phase-5j-regression-certification.sh
```

Il runner verifica con i test reali del repository:

1. precedence `canonical-first → legacy mapping → raw legacy fallback`;
2. compatibilità del payload old client con solo `sport`;
3. compatibilità del payload new client con il solo `primarySport.canonical`;
4. rifiuto della presenza simultanea di `sport` e `primarySport`;
5. filtri Search e Opportunities, inclusi record italiani legacy senza UUID;
6. proiezione canonica di Profile, Experience, Opportunity e Applications;
7. Discover e WhoToFollow con autenticazione cookie/Bearer;
8. localizzazione di Sport e ruoli nelle quattro lingue web;
9. presenza delle cinque migration mirate, typecheck e lint dei consumer modificati.

Il risultato richiesto è:

```text
PHASE_5J_REPOSITORY_REGRESSION_PASS migrations=5 canonical_legacy_contracts=pass consumers=pass payloads=pass i18n=pass typecheck=pass lint=pass
```

## Gate 2 — matrice finale senza replay delle fasi concluse

La certificazione finale combina il marker del Gate 1 con le evidenze Production già
raccolte. Non serve ricreare dati o ripetere gli smoke 5F–5I.

| Area | Evidenza richiesta | Stato iniziale 5J |
| --- | --- | --- |
| Italia legacy | Search/Opportunities includono righe `sport` legacy prive di UUID | Coperta da smoke 5I + test fallback 5J |
| Canonical-first | UUID prevalgono quando presenti; mapping e raw fallback restano compatibili | Test 5J |
| Old/new client | `{ sport }` e `{ primarySport: { canonical } }` accettati separatamente | Test 5J |
| Profile/Experience | save+reread UI e contratto payload esclusivo | PASS 5I + test 5J |
| Opportunity/Application | create/read/update/delete e proiezione Application senza duplicazione | PASS 5I/5G + test 5J |
| Search/Discover/WhoToFollow | filtri e consumer autenticati | PASS 5H/5I + test 5J |
| RLS/ownership | nessuna migration 5I/5J; ownership Profile, Experience, Opportunity e Application invariata | Audit schema 5F/5G + test route 5J |
| Performance | indici canonici presenti; query limitate/paginate; nessun nuovo join o N+1 introdotto in 5J | Audit migration + lint/test 5J |
| Sei Paesi | il contratto canonico è country-neutral; IT, FR, ES, CH, SI e PL restano nel catalogo geografico verificato | Roadmap Production |
| Mobile | nessuna dichiarazione di parity implicita; handoff al repository Mobile separato | Deferred esplicito |

## Classificazione finale

Emettere il marker seguente soltanto se il Gate 1 termina con exit code `0` e nessuna
evidenza Production accettata è stata successivamente invalidata da un nuovo deploy:

```text
PHASE_5J_FINAL_CERTIFICATION_PASS
release=d69768bb2df05bb8fb7ead409cba83e806b4c76b
repository_regression=pass production_5i=pass migration_history=pass
legacy_italy=pass canonical_first=pass old_new_client=pass rls_ownership=pass performance=pass
mobile_handoff=separate
```

Se nel frattempo `/api/env` espone una release diversa, fermarsi con
`PHASE_5J_FINAL_CERTIFICATION_STOP release_drift`: la nuova release richiede una
valutazione mirata delle sole modifiche intercorse, non il replay automatico di tutte
le fasi concluse.
