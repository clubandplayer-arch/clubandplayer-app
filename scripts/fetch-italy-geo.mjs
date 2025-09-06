// scripts/fetch-italy-geo.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SOURCES = [
  'https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json',
  'https://raw.githubusercontent.com/impattozero/comuni-italiani-json/master/comuni.json'
];

function pick(obj, ...paths) {
  for (const p of paths) {
    const segs = p.split('.');
    let cur = obj;
    for (const s of segs) cur = cur?.[s];
    if (cur != null) return cur;
  }
  return null;
}
function titleCase(s) { return String(s || '').toLowerCase().replace(/\b\p{L}/gu, m => m.toUpperCase()); }

async function download() {
  let data = null, used = null;
  for (const url of SOURCES) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      data = await r.json(); used = url; break;
    } catch (e) { console.warn(`WARNING: sorgente fallita ${url}: ${e.message}`); }
  }
  if (!Array.isArray(data)) throw new Error('Nessuna sorgente valida per comuni italiani');
  console.log(`Usata sorgente: ${used}  (records: ${data.length})`);
  return data;
}

async function build() {
  const rows = await download();

  const regionsSet = new Set();
  const provincesByRegion = new Map();
  const citiesByProvince = new Map();

  for (const row of rows) {
    const region   = pick(row, 'regione','regione.nome','provincia.regione','provincia.regione.nome') ?? '';
    const province = pick(row, 'provincia','provincia.nome','provincia.provincia','provincia_nome','sigla') ?? '';
    const city     = pick(row, 'nome','comune','denominazione') ?? '';

    const R = titleCase(region).trim();
    let   P = titleCase(province).trim();
    const C = titleCase(city).trim();
    if (!R || !P || !C) continue;
    if (P.length === 2) P = P.toUpperCase();

    regionsSet.add(R);
    if (!provincesByRegion.has(R)) provincesByRegion.set(R, new Set());
    provincesByRegion.get(R).add(P);

    if (!citiesByProvince.has(P)) citiesByProvince.set(P, new Set());
    citiesByProvince.get(P).add(C);
  }

  const regions = Array.from(regionsSet).sort((a,b)=>a.localeCompare(b,'it'));
  const provincesObj = {};
  for (const [r,set] of provincesByRegion) provincesObj[r] = Array.from(set).sort((a,b)=>a.localeCompare(b,'it'));
  const citiesObj = {};
  for (const [p,set] of citiesByProvince) citiesObj[p] = Array.from(set).sort((a,b)=>a.localeCompare(b,'it'));

  const out = { regions, provincesByRegion: provincesObj, citiesByProvince: citiesObj };
  const outPath = resolve(__dirname, '../public/geo/italy.min.json');
  await mkdir(resolve(__dirname, '../public/geo'), { recursive: true });
  await writeFile(outPath, JSON.stringify(out));
  console.log(`✔ Scritto: ${outPath}`);
}

build().catch(e => { console.error(e); process.exit(1); });
