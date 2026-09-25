import fs from "node:fs";
import path from "node:path";

import csv from "csv-parser";

const INPUT_FILE = path.join(
  process.cwd(),
  "imports/registry/registry_clubs_master_geo.csv"
);

const CP_VISIBLE_SPORT_TOKENS = new Map([
  ["calcio", "Calcio / Futsal / Calcio a 8"],
  ["volley", "Volley"],
  ["basket", "Basket"],
  ["pallanuoto", "Pallanuoto"],
  ["pallamano", "Pallamano"],
  ["rugby", "Rugby"],
  ["hockey", "Hockey"],
  ["baseball", "Baseball / Softball"],
]);

const ALL_CP_SPORTS = [
  "Calcio",
  "Calcio a 8",
  "Futsal",
  "Volley",
  "Basket",
  "Pallanuoto",
  "Pallamano",
  "Rugby",
  "Hockey su prato",
  "Hockey su ghiaccio",
  "Baseball",
  "Softball",
  "Lacrosse",
  "Football americano",
];

const EXPLICIT_ASD = /(?:\bA\.?\s*S\.?\s*D\.?\b|ASSOCIAZIONE\s+SPORTIVA\s+DILETTANTISTICA|ASS(?:OCIAZIONE|\.)?\s+SPORT(?:IVA|\.)?\s+DILETTANTISTICA)/i;
const EXPLICIT_SSD = /(?:\bS\.?\s*S\.?\s*D\.?\b|SOCIETA'?\s+SPORTIVA\s+DILETTANTISTICA|SOC(?:IETA'?|\.)?\s+SPORT(?:IVA|\.)?\s+DILETTANTISTICA)/i;
const COMPANY = /(?:\bS\.?\s*R\.?\s*L\.?\b|\bSRL\b|\bS\.?\s*P\.?\s*A\.?\b|\bSPA\b|COOPERATIVA|\bCOOP\b)/i;
const ASSOCIATION = /(?:ASSOCIAZIONE|ASSOCIATION|ASS\.|CIRCOLO|CLUB|POLISPORTIVA|CENTRO\s+SPORTIVO|C\.S\.|CUS|C\.U\.S\.)/i;

const MEMBER_COLUMN_CANDIDATES = [
  "tesserati",
  "numero_tesserati",
  "num_tesserati",
  "totale_tesserati",
  "tot_tesserati",
  "n_tesserati",
  "atleti_tesserati",
  "tesserati_totali",
  "registered_members",
  "members_count",
];

function normalizeHeader(value) {
  return value.replace(/^\uFEFF/, "");
}

function parseTokens(value) {
  return String(value || "")
    .split("|")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function classifyLegalForm(name) {
  const value = String(name || "").toUpperCase();
  const hasAsd = EXPLICIT_ASD.test(value);
  const hasSsd = EXPLICIT_SSD.test(value);

  if (hasAsd && hasSsd) return "ASD + SSD esplicite";
  if (hasAsd) return "ASD esplicita";
  if (hasSsd) return "SSD esplicita";
  if (COMPANY.test(value)) return "Società/impresa non SSD esplicita";
  if (ASSOCIATION.test(value)) return "Associazione/club senza ASD esplicita";
  return "Forma non deducibile dalla denominazione";
}

function add(counter, key, amount = 1) {
  counter.set(key, (counter.get(key) || 0) + amount);
}

function percent(value, total) {
  return total ? `${((value / total) * 100).toFixed(1)}%` : "0.0%";
}

function sortEntries(counter) {
  return [...counter.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function getHeaders(rows) {
  const firstRow = rows[0] || {};
  return Object.keys(firstRow);
}

function findMemberColumn(headers) {
  const byNormalizedName = new Map(
    headers.map((header) => [header.trim().toLowerCase(), header])
  );

  for (const candidate of MEMBER_COLUMN_CANDIDATES) {
    const header = byNormalizedName.get(candidate);
    if (header) return header;
  }

  return null;
}

function parseInteger(value) {
  const normalized = String(value || "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .trim();

  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

async function readRows() {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(INPUT_FILE)
      .pipe(csv({ mapHeaders: ({ header }) => normalizeHeader(header) }))
      .on("data", (row) => rows.push(row))
      .on("error", reject)
      .on("end", () => resolve(rows));
  });
}

const rows = await readRows();
const headers = getHeaders(rows);
const memberColumn = findMemberColumn(headers);
const visibleRows = [];
const visibleBySport = new Map();
const allTokens = new Map();
const legalForms = new Map();
const regions = new Map();
const visibleSportTokens = new Set(CP_VISIBLE_SPORT_TOKENS.keys());
let visibleMemberTotal = 0;
let visibleRowsWithMemberData = 0;

for (const row of rows) {
  const tokens = parseTokens(row.sport_normalizzati);

  for (const token of tokens) {
    add(allTokens, token);
  }

  const matchedTokens = tokens.filter((token) => visibleSportTokens.has(token));
  if (!matchedTokens.length) continue;

  visibleRows.push(row);

  if (memberColumn) {
    const members = parseInteger(row[memberColumn]);
    if (members !== null) {
      visibleMemberTotal += members;
      visibleRowsWithMemberData += 1;
    }
  }

  add(legalForms, classifyLegalForm(row.denominazione));
  add(regions, row.regione_normalizzata || row.regione || "Regione non valorizzata");

  for (const token of new Set(matchedTokens)) {
    add(visibleBySport, CP_VISIBLE_SPORT_TOKENS.get(token));
  }
}

const total = rows.length;
const visible = visibleRows.length;
const hidden = total - visible;

console.log("# Audit società C&P visibili");
console.log(`File: ${INPUT_FILE}`);
console.log(`Sport C&P configurati: ${ALL_CP_SPORTS.join(", ")}`);
console.log(`Totale società nel master: ${total}`);
console.log(`Società con almeno uno sport visibile C&P: ${visible} (${percent(visible, total)})`);
console.log(`Società fuori perimetro C&P: ${hidden} (${percent(hidden, total)})`);

console.log("\n## Tesserati");
if (memberColumn) {
  console.log(`Colonna tesserati rilevata: ${memberColumn}`);
  console.log(`Società visibili con dato tesserati: ${visibleRowsWithMemberData}/${visible}`);
  console.log(`Totale tesserati società visibili: ${visibleMemberTotal}`);
} else {
  console.log("Dato tesserati non disponibile nei CSV versionati/importati.");
  console.log(`Colonne disponibili nel master: ${headers.join(", ")}`);
}

console.log("\n## Società visibili per sport/token C&P");
for (const [sport, count] of sortEntries(visibleBySport)) {
  console.log(`- ${sport}: ${count} (${percent(count, visible)} delle visibili)`);
}

console.log("\n## Forme societarie dedotte dalla denominazione");
for (const [form, count] of sortEntries(legalForms)) {
  console.log(`- ${form}: ${count} (${percent(count, visible)} delle visibili)`);
}

console.log("\n## Prime 10 regioni per società visibili");
for (const [region, count] of sortEntries(regions).slice(0, 10)) {
  console.log(`- ${region}: ${count}`);
}

console.log("\n## Token sportivi più frequenti nel master completo");
for (const [token, count] of sortEntries(allTokens).slice(0, 12)) {
  console.log(`- ${token}: ${count}`);
}
