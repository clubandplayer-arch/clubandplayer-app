import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const CSV_PATH =
  "imports/registry/figc_core_clubs.csv";

function parseCsv(content) {
  const lines = content.split("\n");

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim());

  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    if (!line.trim()) continue;

    const values = [];
    let current = "";
    let insideQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];

      if (char === '"') {
        insideQuotes = !insideQuotes;
        continue;
      }

      if (char === "," && !insideQuotes) {
        values.push(current);
        current = "";
        continue;
      }

      current += char;
    }

    values.push(current);

    const row = {};

    headers.forEach((header, index) => {
      row[header] = (values[index] || "").trim();
    });

    rows.push(row);
  }

  return rows;
}

async function main() {
  console.log("READING CSV...");

  const csvContent = fs.readFileSync(
    path.resolve(CSV_PATH),
    "utf-8"
  );

  const rows = parseCsv(csvContent);

  console.log("ROWS:", rows.length);

  let inserted = 0;
  let failed = 0;

  const chunkSize = 250;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    console.log(
      `IMPORTING ${i + 1}-${Math.min(
        i + chunk.length,
        rows.length
      )}`
    );

    const payload = chunk.map((row) => ({
      source: row.source,
      source_club_id: row.source_club_id,
      name: row.name,
      normalized_name: row.normalized_name,
      fiscal_code: row.fiscal_code || null,
      legal_type: row.legal_type || null,
      region: row.region || null,
      province: row.province || null,
      municipality: row.municipality || null,
      representative_name:
        row.representative_name || null,
      valid_until:
        row.valid_until &&
        row.valid_until.includes("/")
          ? row.valid_until
              .split("/")
              .reverse()
              .join("-")
          : null,
      registered_at:
        row.registered_at &&
        row.registered_at.includes("/")
          ? row.registered_at
              .split("/")
              .reverse()
              .join("-")
          : null,
      detail_url: row.detail_url || null,
    }));

    const { error } = await supabase
      .from("registry_clubs")
      .upsert(payload, {
        onConflict: "source,source_club_id",
      });

    if (error) {
      failed += chunk.length;

      console.error("IMPORT ERROR");
      console.error(error);
    } else {
      inserted += chunk.length;

      console.log(
        `OK INSERTED: ${inserted}`
      );
    }
  }

  console.log("====================================");
  console.log("IMPORT COMPLETED");
  console.log("INSERTED:", inserted);
  console.log("FAILED:", failed);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});