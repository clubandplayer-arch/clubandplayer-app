# FASE 3C-B7 — Compatibility and regression

## Esito

**COMPLETATA — repository web/API.** La matrice automatica riconferma compatibilità Italia legacy, nuovi profili canonici IT/FR/ES/CH/SI/PL, account type, precedenza canonical-first, fallback e separazione tra residence, interessi e sede pubblica.

## Matrice verificata

- **Paesi:** IT, FR, ES, CH con e senza District, SI e PL sono coperti dai contratti di dual-write e dalle gerarchie a profondità variabile.
- **Read:** canonical residence precede mapping legacy residence Italia; il fallback testuale resta successivo. Gli ID legacy `interest_*` non partecipano al fallback residence.
- **Signup/onboarding:** nessuna geografia implicita; il role chooser scrive soltanto `account_type`.
- **Ruoli:** Player/Athlete e Staff possono usare interessi e relocation; Club, Institution e Fan non possono usare il boundary mobility. Club e Institution mantengono la sede pubblica separata.
- **Settings:** ogni ruolo autenticato, incluso Institution, dispone del link desktop e mobile a `/settings`; la sezione interessi resta visibile solo a Player/Staff. Gli Enti possono quindi raggiungere anche i controlli account comuni, inclusa la cancellazione.
- **API/security:** owner profile derivato dalla sessione, una sola operazione B6 per PATCH, cataloghi supported/active e `403` per ruoli non ammessi.

## Limiti operativi

Non sono state eseguite scritture Production, migration, grant, attivazioni RPC o feature gate. Il repository corrente non contiene il client mobile: non è stata modificata alcuna superficie mobile e la mobile international parity resta una fase futura separata. La chiusura B7 certifica il perimetro repository web/API, non un rollout Production.

## Verifica manuale prima del merge

Su Preview autenticata verificare `/settings` per Institution su desktop e viewport mobile, confermare che “Impostazioni” sia raggiungibile, che “Interessi geografici” sia assente e che “Elimina account” sia presente. Ripetere un smoke Player/Staff per interessi e relocation e un controllo Club/Institution sull'assenza della sezione mobility.
