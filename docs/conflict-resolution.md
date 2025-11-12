# Risoluzione dei conflitti di merge su GitHub

Quando apri una Pull Request e GitHub mostra "This branch has conflicts that must be resolved", significa che sul branch di destinazione (di solito `work` o `main`) ci sono cambiamenti più recenti rispetto al tuo branch. Per fondere le due versioni devi sincronizzare la tua copia locale e risolvere i conflitti manualmente. Segui questi passaggi:

## 1. Aggiorna il branch di destinazione in locale
```bash
git checkout work
git pull origin work
```
Se stai lavorando su un branch diverso (es. `feature/mio-branch`), assicurati che `work` sia aggiornato prima di proseguire.

## 2. Torna sul tuo branch di lavoro
```bash
git checkout <nome-branch>
```
Sostituisci `<nome-branch>` con quello indicato nella PR (nell'esempio dello screenshot è `fix/codex-cleanup`).

## 3. Fai il merge (o rebase) del branch aggiornato
Metodo più semplice (merge):
```bash
git merge work
```
In alternativa puoi usare `git rebase work` se preferisci una cronologia lineare. Durante questa operazione Git segnalerà i file in conflitto.

## 4. Risolvi i conflitti file per file
Per ogni file segnato da Git:
1. Apri il file in editor.
2. Cerca i blocchi con i marcatori `<<<<<<<`, `=======`, `>>>>>>>`.
3. Scegli la versione corretta o combina le due porzioni di codice.
4. Rimuovi i marcatori di conflitto e salva il file.

Al termine di ogni file risolto:
```bash
git add <percorso-file>
```

## 5. Verifica lo stato e crea il commit di merge
```bash
git status
```
Se tutti i conflitti sono risolti e i file sono in stage:
```bash
git commit
```
Il messaggio predefinito indicherà che si tratta di un "Merge" (o "Rebase").

## 6. Spingi il branch aggiornato e aggiorna la PR
```bash
git push origin <nome-branch>
```
GitHub ricalcolerà la PR. Se i conflitti sono risolti correttamente, l'avviso scomparirà e Vercel lancerà un nuovo deploy.

---

### Suggerimenti aggiuntivi
- Se durante il merge compaiono errori complessi, puoi annullare l'operazione con `git merge --abort` o `git rebase --abort` e ripetere la procedura.
- Dopo aver risolto i conflitti, è buona pratica rieseguire i comandi di verifica (`pnpm lint`, `pnpm run build`).
- Per facilitare la revisione, aggiungi una nota nella PR indicando quali file sono stati toccati dal merge.

Seguendo questi passaggi il tuo lavoro non andrà perso: stai semplicemente integrando i cambiamenti più recenti dal branch principale prima di completare la PR.
