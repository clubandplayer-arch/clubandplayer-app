import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const AFFILIATIONS_CSV = "imports/registry/registry_affiliations_figc.csv";
const DISCIPLINES_CSV = "imports/registry/figc_core_disciplines.csv";

function parseCsv(content) {
  const lines = content.split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;

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

function toIsoDate(value) {
  if (!value) return null;

  if (value.includes("/")) {
    return value.split("/").reverse().join("-");
  }

  return value || null;
}

async function loadRegistryClubMap() {
  console.log("Loading registry_clubs map...");

  let from = 0;
  const pageSize = 1000;
  const map = new Map();

  while (true) {
    const { data, error } = await supabase
      .from("registry_clubs")
      .select("id,source_club_id")
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    for (const row of data || []) {
      map.set(String(row.source_club_id), row.id);
    }

    if (!data || data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  console.log("Registry clubs loaded:", map.size);
  return map;
}

async function importAffiliations(clubMap) {
  console.log("Reading affiliations CSV...");

  const content = fs.readFileSync(path.resolve(AFFILIATIONS_CSV), "utf-8");
  const rows = parseCsv(content);

  console.log("Affiliations rows:", rows.length);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  const chunkSize = 250;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    const payload = [];

    for (const row of chunk) {
      const sourceClubId = row.registry_club_id.replace("coni:", "");
      const registryClubId = clubMap.get(sourceClubId);

      if (!registryClubId) {
        skipped++;
        continue;
      }

      payload.push({
        registry_club_id: registryClubId,
        organism: row.organism,
        affiliation_code: row.affiliation_code || null,
        sport_year_start: toIsoDate(row.sport_year_start),
        sport_year_end: toIsoDate(row.sport_year_end),
      });
    }

    if (!payload.length) continue;

    const { error } = await supabase
      .from("registry_club_affiliations")
      .upsert(payload, {
        onConflict: "registry_club_id,organism,affiliation_code",
      });

    if (error) {
      failed += payload.length;
      console.error("Affiliations import error:", error);
    } else {
      inserted += payload.length;
      console.log(`Affiliations OK: ${inserted}`);
    }
  }

  console.log("Affiliations completed:", { inserted, skipped, failed });
}

async function importDisciplines(clubMap) {
  console.log("Reading disciplines CSV...");

  const content = fs.readFileSync(path.resolve(DISCIPLINES_CSV), "utf-8");
  const rows = parseCsv(content);

  console.log("Discipline rows:", rows.length);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  const chunkSize = 250;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    const payload = [];

    for (const row of chunk) {
      const sourceClubId = row.registry_club_id.replace("coni:", "");
      const registryClubId = clubMap.get(sourceClubId);

      if (!registryClubId) {
        skipped++;
        continue;
      }

      payload.push({
        registry_club_id: registryClubId,
        discipline_raw: row.discipline_raw,
        clubandplayer_sport: row.clubandplayer_sport,
      });
    }

    if (!payload.length) continue;

    const { error } = await supabase
      .from("registry_club_disciplines")
      .upsert(payload, {
        onConflict: "registry_club_id,discipline_raw,clubandplayer_sport",
      });

    if (error) {
      failed += payload.length;
      console.error("Disciplines import error:", error);
    } else {
      inserted += payload.length;
      console.log(`Disciplines OK: ${inserted}`);
    }
  }

  console.log("Disciplines completed:", { inserted, skipped, failed });
}

async function main() {
  const clubMap = await loadRegistryClubMap();

  await importAffiliations(clubMap);
  await importDisciplines(clubMap);

  console.log("====================================");
  console.log("RELATIONS IMPORT COMPLETED");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});