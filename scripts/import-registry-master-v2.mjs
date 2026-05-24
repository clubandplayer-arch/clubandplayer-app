import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
});

const CSV_PATH = path.resolve("imports/registry/registry_clubs_master_geo.csv");
const CHUNK_SIZE = 500;

function clean(value) {
  return String(value || "").trim();
}

async function importChunk(chunk, index) {
  if (!chunk.length) {
    return 0;
  }

  const uniqueMap = new Map();

  for (const row of chunk) {
    const masterId = clean(row.master_id);

    if (!masterId) {
      continue;
    }

    const item = {
      master_id: masterId,
      codice_fiscale: clean(row.codice_fiscale) || null,
      denominazione: clean(row.denominazione),
      regione: clean(row.regione_normalizzata),
      provincia: clean(row.provincia_normalizzata),
      comune: clean(row.comune_normalizzato),
      sport_normalizzati: clean(row.sport_normalizzati),
      organisms: clean(row.organisms),
      source_count: Number(row.source_count || 1),
    };

    uniqueMap.set(item.master_id, item);
  }

  const payload = Array.from(uniqueMap.values());

  if (!payload.length) {
    console.warn(`Chunk ${index} saltato: nessun master_id valido`);
    return 0;
  }

  const { error } = await supabase
    .from("registry_clubs_master")
    .upsert(payload, {
      onConflict: "master_id",
    });

  if (error) {
    console.error("ERRORE CHUNK:", index, error);
    throw error;
  }

  console.log(`Chunk ${index} importato (${payload.length} record)`);
  return payload.length;
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV non trovato: ${CSV_PATH}`);
  }

  console.log("IMPORT START");
  console.log("CSV:", CSV_PATH);

  const rows = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_PATH)
      .pipe(
        csv({
          mapHeaders: ({ header }) =>
            String(header || "")
              .replace(/^\uFEFF/, "")
              .trim(),
        })
      )
      .on("data", (data) => {
        const masterId = clean(data.master_id);

        if (!masterId) {
          return;
        }

        rows.push(data);
      })
      .on("end", resolve)
      .on("error", reject);
  });

  console.log("RIGHE VALIDE LETTE:", rows.length);
  console.log("PRIMA RIGA:");
  console.log(rows[0]);

  let imported = 0;
  let chunkIndex = 1;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const importedInChunk = await importChunk(chunk, chunkIndex);

    imported += importedInChunk;

    console.log(`PROGRESS: ${imported}/${rows.length}`);

    chunkIndex += 1;
  }

  console.log("====================================");
  console.log("IMPORT COMPLETATO");
  console.log("TOTALE IMPORTATO:", imported);
  console.log("====================================");
}

main().catch((err) => {
  console.error("FATAL ERROR");
  console.error(err);
  process.exit(1);
});