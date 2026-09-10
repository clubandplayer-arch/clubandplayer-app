# FASE 5F-B — Preflight read-only primary sport Profile

Data: 2026-09-08  
Stato: **SCRIPT CREATO E VALIDATO LOCALMENTE; AMBIENTI CONDIVISI NON ACCESSIBILI/NON CONTROLLATI**

## 1. Stato distinto per ambiente

| Ambiente | Controllo eseguito in 5F-B | Esito |
| --- | --- | --- |
| PostgreSQL locale isolato 16.15 | Sì, scenario pre-apply e post-apply sintetico | **PASS dello script** |
| Preview condiviso | No: nessun CLI, URL/password o secret di connessione disponibile nel processo | **NOT EXECUTED / NON VERIFICATO** |
| Production condiviso | No: nessun CLI, URL/password o secret di connessione disponibile nel processo | **NOT EXECUTED / NON VERIFICATO** |

Il PASS locale prova il comportamento del report, non lo stato di Preview o Production. La presenza della migration nel repository non viene usata come prova di applicazione.

Il checkpoint precedente registra 5C come applicata in Production con verifica **user-reported**; 5D-C resta non applicata agli ambienti condivisi; 5F-A è soltanto creata e testata localmente. 5F-B non promuove nessuno di questi stati a verifica indipendente.

## 2. Report predisposto

File: `scripts/sports/reports/phase-5f-b-profile-primary-sport-preflight-read-only.sql`.

Il report apre una transazione `READ ONLY`, restituisce una sola cella JSON e termina con `ROLLBACK`. Verifica:

- tabelle e tipi prerequisito;
- candidate key 5C `(id,sport_id)` e `(id,discipline_id)`;
- presenza, tipo, nullability e default delle tre colonne 5F-A;
- collisioni e stato validato dei quattro constraint nominati;
- trigger applicativi presenti su `profiles` e relativo stato;
- history separata per 5C, 5D-C e 5F-A;
- assenza/partialità/schema già applicato.

Classificazioni terminali:

- `PASS_READY_TO_APPLY_5F_A`;
- `PASS_5F_A_ALREADY_APPLIED`;
- oppure uno stato `BLOCKED_*` fail-closed con dettagli nello stesso JSON.

5D-C è riportata ma non è una dipendenza della migration 5F-A. Il report non prende advisory lock o table lock espliciti e non contiene DDL/DML.

## 3. Istruzioni Codespace copia/incolla

Usare una connessione già autorizzata come Codespace secret; non inviare né incollare password in chat, file o output. Eseguire separatamente per ogni ambiente disponibile.

### Production

```bash
cd /workspace/clubandplayer-app
set +x
: "${PRODUCTION_DATABASE_URL:?Configura PRODUCTION_DATABASE_URL come Codespace secret}"
REPORT='scripts/sports/reports/phase-5f-b-profile-primary-sport-preflight-read-only.sql'
psql "$PRODUCTION_DATABASE_URL" -X -v ON_ERROR_STOP=1 -P pager=off -f "$REPORT" \
  | tee /tmp/phase-5f-b-production-preflight.txt
unset PRODUCTION_DATABASE_URL
```

### Preview

```bash
cd /workspace/clubandplayer-app
set +x
: "${PREVIEW_DATABASE_URL:?Configura PREVIEW_DATABASE_URL come Codespace secret}"
REPORT='scripts/sports/reports/phase-5f-b-profile-primary-sport-preflight-read-only.sql'
psql "$PREVIEW_DATABASE_URL" -X -v ON_ERROR_STOP=1 -P pager=off -f "$REPORT" \
  | tee /tmp/phase-5f-b-preview-preflight.txt
unset PREVIEW_DATABASE_URL
```

Copiare per la review soltanto la cella JSON `phase_5f_b_preflight`, verificando che contenga `"transactionReadOnly": "on"`; non condividere la connection string. Se un ambiente non esiste o non è autorizzato, registrarlo come `NOT ACCESSIBLE`, non come PASS o come migration assente.

## 4. Readiness e piano di apply

In questo momento la sola 5F-A **non può essere dichiarata pronta per un ambiente condiviso**, perché nessun ambiente condiviso è stato controllato. Perciò 5F-B non prepara né autorizza comandi mutativi, history repair o lock di apply.

Se il JSON di un ambiente restituisce `PASS_READY_TO_APPLY_5F_A`, il passaggio successivo sarà un runbook separato che dovrà specificare:

1. ambiente destinatario univoco;
2. checksum del file migration;
3. finestra e gestione dell'`ACCESS EXCLUSIVE` lock acquisito dagli `ALTER TABLE profiles`;
4. esecuzione esclusiva del file in transazione;
5. post-check read-only;
6. gestione history compatibile con lo stato reale, senza `db push` e solo dopo autorizzazione esplicita.

**Nessuna applicazione deve essere eseguita prima di una nuova autorizzazione utente esplicita.**

## 5. Prossimo passaggio

Eseguire il report da Codespace sugli ambienti effettivamente accessibili e restituire i JSON sanitizzati. Solo dopo sarà possibile classificare Preview e Production separatamente e decidere se autorizzare il runbook/apply esclusivo della 5F-A.

5D-E-I resta aperta e non iniziata per FR/ES/CH/SI/PL ed è separata da questo preflight.
