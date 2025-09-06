// scripts/build-italy-geo-ISTAT.mjs
// Converte l'Elenco ISTAT in /public/geo/italy.min.json (solo stringhe).
// Node >= 18 (fetch built-in), nessuna dipendenza.

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ISTAT_URL =
  'https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.csv';

function csvParse(text, delimiter = ';') {
  // Parser CSV minimale che gestisce i campi tra doppi apici e i ;
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'; i += 2; continue;
        } else {
          inQuotes = false; i++; continue;
        }
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === delimiter) { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  row.push(field); rows.push(row);
  return rows;
}

const normHeader = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ');

// pick col name by candidates
function findCol(headers, ...cands) {
  const H = headers.map(normHeader);
  for (const cand of cands) {
    const idx = H.indexOf(normHeader(cand));
    if (idx !== -1) return headers[idx];
    // match contains
    for (let j = 0; j < H.length; j++) if (H[j].includes(normHeader(cand))) return headers[j];
  }
  throw new Error(`Colonna non trovata tra: ${cands.join(', ')}`);
}

function toStr(x) {
  if (x == null) return '';
  if (typeof x === 'string') return x;
  if (typeof x === 'number' || typeof x === 'boolean') return String(x);
  if (typeof x === 'object') {
    for (const k of ['nome', 'name', 'denominazione', 'label', 'description']) {
      if (typeof x[k] === 'string') return x[k];
    }
  }
  return String(x);
}

const itColl = new Intl.Collator('it', { sensitivity: 'base' });

async function build() {
  console.log('Scarico ISTAT…');
  const res = await fetch(ISTAT_URL);
  if (!res.ok) throw new Error(`ISTAT HTTP ${res.status}`);
  const txt = await res.text();

  const rows = csvParse(txt, ';');
  const headers = rows[0];
  const body = rows.slice(1);

  const regCol = findCol(
    headers,
    'Denominazione regione'
  );
  const provCol = findCol(
    headers,
    "Denominazione provincia",
    "denominazione dell'unità territoriale sovracomunale"
  );
  const muniCol = findCol(
    headers,
    'Denominazione in italiano',
    'Denominazione (italiano e straniero)',
    'Denominazione'
  );

  // region -> province (Set)
  const provincesByRegion = new Map(); // Map<string, Set<string>>
  // province -> cities (Set)
  const citiesByProvince = new Map();  // Map<string, Set<string>>
  const regionsSet = new Set();

  for (const r of body) {
    const rawRegion = r[headers.indexOf(regCol)]?.trim() || '';
    let rawProv = r[headers.indexOf(provCol)]?.trim() || '';
    const rawCity = r[headers.indexOf(muniCol)]?.trim() || '';
    if (!rawRegion || !rawCity) continue;

    // Caso speciale: Valle d'Aosta spesso ripete il nome della regione al posto della provincia
    const regLower = rawRegion.toLowerCase();
    if (
      regLower.startsWith("valle d'aosta") ||
      regLower.startsWith('valle d’osta') ||
      regLower.includes('vallée d’aoste') ||
      regLower.includes('valle d aosta')
    ) {
      if (!rawProv || normHeader(rawProv) === normHeader(rawRegion)) rawProv = 'Aosta';
    }

    const region = toStr(rawRegion);
    const prov = toStr(rawProv);
    const city = toStr(rawCity);

    regionsSet.add(region);
    if (!provincesByRegion.has(region)) provincesByRegion.set(region, new Set());
    provincesByRegion.get(region).add(prov);

    if (!citiesByProvince.has(prov)) citiesByProvince.set(prov, new Set());
    citiesByProvince.get(prov).add(city);
  }

  const regions = Array.from(regionsSet).sort(itColl.compare);
  const provincesObj = {};
  for (const [reg, set] of provincesByRegion) {
    provincesObj[reg] = Array.from(set).sort(itColl.compare);
  }
  const citiesObj = {};
  for (const [prov, set] of citiesByProvince) {
    citiesObj[prov] = Array.from(set).sort(itColl.compare);
  }

  const out = { regions, provincesByRegion: provincesObj, citiesByProvince: citiesObj };
  const outPath = resolve(__dirname, '../public/geo/italy.min.json');
  await mkdir(resolve(__dirname, '../public/geo'), { recursive: true });
  await writeFile(outPath, JSON.stringify(out));
  console.log('✔ Scritto', outPath);
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
