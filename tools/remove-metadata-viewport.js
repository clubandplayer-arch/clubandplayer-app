// tools/remove-metadata-viewport.js
// Rimuove in modo sicuro la proprietà `viewport` dall'export const metadata = { ... } in app/**/*.tsx
// Mantiene tutte le altre chiavi immutate.

const { execSync } = require('node:child_process');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

function listFiles() {
  const out = execSync(`git ls-files "app/**/*.tsx"`, { encoding: 'utf8' });
  return out.split('\n').map(s => s.trim()).filter(Boolean);
}

function findMetadataObjectRange(code, startIdx) {
  // Cerca "=" dopo "export const metadata"
  const eq = code.indexOf('=', startIdx);
  if (eq === -1) return null;
  // Cerca la prima '{' dopo '='
  let i = code.indexOf('{', eq);
  if (i === -1) return null;

  // Match delle graffe fino a chiusura dell'oggetto metadata
  let depth = 0;
  let inStr = false;
  let strCh = '';
  for (let j = i; j < code.length; j++) {
    const ch = code[j];
    if (inStr) {
      if (ch === '\\') { j++; continue; }
      if (ch === strCh) { inStr = false; strCh = ''; }
      continue;
    } else {
      if (ch === '"' || ch === "'") { inStr = true; strCh = ch; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          // Range dell'oggetto { ... }
          return { start: i, end: j };
        }
      }
    }
  }
  return null;
}

function removeViewportPropFromObjectText(objText) {
  // Rimuove la proprietà viewport (a livello top) gestendo valori stringa/oggetto/array
  let i = 0;
  let depth = 0;
  let inStr = false;
  let strCh = '';
  let lastCommaPosAtDepth0 = -1;
  let result = '';
  let removedSomething = false;

  while (i < objText.length) {
    const ch = objText[i];

    if (inStr) {
      result += ch;
      if (ch === '\\') {
        // copia anche il carattere escapato
        if (i + 1 < objText.length) {
          result += objText[i + 1];
          i += 2;
          continue;
        }
      } else if (ch === strCh) {
        inStr = false;
        strCh = '';
      }
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inStr = true;
      strCh = ch;
      result += ch;
      i++;
      continue;
    }

    if (ch === '{') { depth++; result += ch; i++; continue; }
    if (ch === '}') { depth--; result += ch; i++; continue; }

    if (depth === 0 && ch === ',') {
      lastCommaPosAtDepth0 = result.length; // posizione nel result
      result += ch;
      i++;
      continue;
    }

    // Prova a riconoscere "viewport" come chiave a depth 0
    if (depth === 0) {
      // Salta spazi
      let k = i;
      while (k < objText.length && /\s/.test(objText[k])) k++;

      // Leggi possibile identificatore/chiave (con o senza virgolette)
      let keyStart = k;
      let key = '';
      let quoted = false;

      if (objText[k] === '"' || objText[k] === "'") {
        quoted = true;
        const q = objText[k++];
        let sb = '';
        while (k < objText.length) {
          const c = objText[k++];
          if (c === '\\') { k++; continue; }
          if (c === q) break;
          sb += c;
        }
        key = sb;
        // salta spazi
        while (k < objText.length && /\s/.test(objText[k])) k++;
        if (objText[k] !== ':') { // non è una chiave valida
          result += objText.slice(i, k);
          i = k;
          continue;
        }
      } else {
        // chiave non quotata (viewport, openGraph, ecc.)
        let sb = '';
        while (k < objText.length && /[A-Za-z0-9_\$]/.test(objText[k])) {
          sb += objText[k++];
        }
        key = sb;
        while (k < objText.length && /\s/.test(objText[k])) k++;
        if (objText[k] !== ':') {
          // non è una key:value → copia e continua
          result += objText[i];
          i++;
          continue;
        }
      }

      // Ora k è su ':'
      if (key === 'viewport') {
        // Avanza oltre ':'
        k++;
        // Salta spazi
        while (k < objText.length && /\s/.test(objText[k])) k++;

        // Salta il valore (brace-aware / bracket-aware / string / bare)
        const startVal = k;
        let valEnd = k;

        if (objText[k] === '{' || objText[k] === '[') {
          const openCh = objText[k];
          const closeCh = openCh === '{' ? '}' : ']';
          let d = 0;
          let inS = false, sCh = '';
          while (valEnd < objText.length) {
            const c = objText[valEnd];
            if (inS) {
              if (c === '\\') { valEnd += 2; continue; }
              if (c === sCh) { inS = false; sCh = ''; }
              valEnd++;
              continue;
            } else {
              if (c === '"' || c === "'") { inS = true; sCh = c; valEnd++; continue; }
              if (c === openCh) d++;
              if (c === closeCh) {
                d--;
                valEnd++;
                if (d === 0) break;
                continue;
              }
              valEnd++;
            }
          }
        } else if (objText[k] === '"' || objText[k] === "'") {
          const q = objText[k];
          valEnd++; // salta l'apertura
          while (valEnd < objText.length) {
            const c = objText[valEnd];
            if (c === '\\') { valEnd += 2; continue; }
            if (c === q) { valEnd++; break; }
            valEnd++;
          }
        } else {
          // valore "bare" fino a virgola o chiusura oggetto a depth 0
          while (valEnd < objText.length && objText[valEnd] !== ',' && objText[valEnd] !== '}') {
            valEnd++;
          }
        }

        // Include un'eventuale virgola di chiusura/separazione
        let after = valEnd;
        // Salta spazi
        while (after < objText.length && /\s/.test(objText[after])) after++;
        if (objText[after] === ',') after++;

        // Ora rimuoviamo dal result:
        // - se l'ultima cosa nel result a depth 0 è una virgola, la teniamo
        // - altrimenti, se la prossima cosa in objText dopo la prop è una virgola, non la duplichiamo
        // Semplicemente: non aggiungiamo nulla a result per questa prop
        removedSomething = true;

        // Avanza il cursore di input
        i = after;
        continue;
      } else {
        // Non è viewport → copia 1 char e continua (conservativo)
        result += objText[i];
        i++;
        continue;
      }
    }

    // default: copia char
    result += ch;
    i++;
  }

  return { text: result, changed: removedSomething };
}

function processFile(path) {
  const code = readFileSync(path, 'utf8');

  const marker = 'export const metadata';
  let idx = 0;
  let changed = false;
  let out = code;

  while (true) {
    const found = out.indexOf(marker, idx);
    if (found === -1) break;

    const range = findMetadataObjectRange(out, found);
    if (!range) { idx = found + marker.length; continue; }

    const before = out.slice(0, range.start);
    const objText = out.slice(range.start, range.end + 1); // include braces
    const after = out.slice(range.end + 1);

    const inner = objText.slice(1, -1); // contenuto senza graffe esterne
    const { text: newInner, changed: ch } = removeViewportPropFromObjectText(inner);
    if (ch) {
      out = before + '{' + newInner + '}' + after;
      changed = true;
      idx = before.length + 1 + newInner.length + 1; // nuova posizione dopo l’oggetto
    } else {
      idx = range.end + 1;
    }
  }

  if (changed) {
    writeFileSync(path, out, 'utf8');
    return true;
  }
  return false;
}

function main() {
  const files = listFiles();
  let touched = 0;
  for (const f of files) {
    const did = processFile(f);
    if (did) {
      console.log('updated', f);
      touched++;
    }
  }
  console.log(`Done. Updated ${touched} file(s).`);
}

main();
