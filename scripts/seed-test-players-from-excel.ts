/*
 * Seed di test per creare utenti Player a partire da un file Excel.
 * Uso previsto solo in locale con SUPABASE_SERVICE_ROLE_KEY.
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function normalizeSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function safeTrim(v: unknown) {
  return typeof v === 'string' ? v.trim() : '';
}

type PlayerRow = {
  fullName: string;
  birthYear?: number | null;
  nationality?: string | null;
  sport?: string | null;
  role?: string | null;
  email?: string | null;
  password?: string | null;
};

const FALLBACK_ROWS: PlayerRow[] = [
  { fullName: 'Salvatore Alicata', birthYear: 1985, role: 'Terzino/Esterno difensivo', email: 'salvatorealicata@test.it', password: 'salvatorealicata' },
  { fullName: 'Alessandro Amato', birthYear: 2003, role: 'Difensore centrale', email: 'alessandroamato@test.it', password: 'alessandroamato' },
  { fullName: 'Andrea Basso', birthYear: 1985, role: 'Seconda Punta', email: 'andreabasso@test.it', password: 'andreabasso' },
  { fullName: 'Sigismondo Bonomo', birthYear: 1989, role: 'Portiere', email: 'sigismondobonomo@test.it', password: 'sigismondobonomo' },
  { fullName: 'Ferdinando Briganti', birthYear: 1986, role: 'Centrocampista centrale', email: 'ferdinandobriganti@test.it', password: 'ferdinandobriganti' },
  { fullName: 'Andrea Carlentini', birthYear: 2008, role: 'Portiere', email: 'andreacarlentini@test.it', password: 'andreacarlentini' },
  { fullName: 'Kevin Carpinteri', birthYear: 1997, role: 'Trequartista', email: 'kevincarpinteri@test.it', password: 'kevincarpinteri' },
  { fullName: 'Sebastiano Costantino', birthYear: 1987, role: 'Punta Centrale', email: 'sebastianocostantino@test.it', password: 'sebastianocostantino' },
  { fullName: 'Salvatore Crisci', birthYear: 2003, role: 'Trequartista', email: 'salvatorecrisci@test.it', password: 'salvatorecrisci' },
  { fullName: "Alessandro D'Aranno", birthYear: 1984, role: 'Punta Centrale', email: 'alessandrodaranno@test.it', password: 'alessandrodaranno' },
  { fullName: 'Salvatore Di Domenico', birthYear: 2003, role: 'Esterno offensivo/Ala', email: 'salvatoredidomenico@test.it', password: 'salvatoredidomenico' },
  { fullName: 'Ciao Di Mari', birthYear: 1987, role: 'Terzino/Esterno difensivo', email: 'ciaodimari@test.it', password: 'ciaodimari' },
  { fullName: 'Marco Ganci', birthYear: 1985, role: 'Portiere', email: 'marcoganci@test.it', password: 'marcoganci' },
  { fullName: 'Rosario Gibilisco', birthYear: 2002, role: 'Esterno offensivo/Ala', email: 'rosariogibilisco@test.it', password: 'rosariogibilisco' },
  { fullName: 'Simone Londra', birthYear: 2007, role: 'Portiere', email: 'simonelondra@test.it', password: 'simonelondra' },
  { fullName: 'Filippo Magro', birthYear: 2004, role: 'Centrocampista centrale', email: 'filippomagro@test.it', password: 'filippomagro' },
  { fullName: 'Matteo Mangano', birthYear: 2005, role: 'Centrocampista centrale', email: 'matteomangano@test.it', password: 'matteomangano' },
  { fullName: 'Salvatore Marchese', birthYear: 2001, role: 'Terzino/Esterno difensivo', email: 'salvatoremarchese@test.it', password: 'salvatoremarchese' },
  { fullName: 'Mattia Marino', birthYear: 2005, role: 'Difensore centrale', email: 'mattiamarino@test.it', password: 'mattiamarino' },
  { fullName: 'Domenico Marturana', birthYear: 1989, role: 'Punta Centrale', email: 'domenicomarturana@test.it', password: 'domenicomarturana' },
  { fullName: 'Davide Modica', birthYear: 1985, role: 'Centrocampista centrale', email: 'davidemodica@test.it', password: 'davidemodica' },
  { fullName: 'Stefano Nanfitò', birthYear: 1982, role: 'Difensore centrale', email: 'stefanonanfito@test.it', password: 'stefanonanfito' },
  { fullName: 'Enrico Ricceri', birthYear: 1998, role: 'Centrocampista centrale', email: 'enricoricceri@test.it', password: 'enricoricceri' },
  { fullName: 'Manlio Rossitto', birthYear: 1985, role: 'Difensore centrale', email: 'manliorossitto@test.it', password: 'manliorossitto' },
  { fullName: 'Mirko Rossitto', birthYear: 1987, role: 'Difensore centrale', email: 'mirkorossitto@test.it', password: 'mirkorossitto' },
  { fullName: 'Ibrahim Sanoh', birthYear: 2007, role: 'Esterno offensivo/Ala', email: 'ibrahimsanoh@test.it', password: 'ibrahimsanoh' },
  { fullName: 'Sergio Scaparra', birthYear: 1982, role: 'Terzino/Esterno difensivo', email: 'sergioscaparra@test.it', password: 'sergioscaparra' },
  { fullName: 'Samuele Sfilio', birthYear: 2002, role: 'Centrocampista centrale', email: 'samuelesfilio@test.it', password: 'samuelesfilio' },
  { fullName: 'Anthony Sgroi', birthYear: 2004, role: 'Terzino/Esterno difensivo', email: 'anthonysgroi@test.it', password: 'anthonysgroi' },
  { fullName: 'Lorenzo Sgroi', birthYear: 2005, role: 'Centrocampista centrale', email: 'lorenzosgroi@test.it', password: 'lorenzosgroi' },
  { fullName: 'Omar Sidibe', birthYear: 2008, role: 'Centrocampista centrale', email: 'omarsidibe@test.it', password: 'omarsidibe' },
];

async function parseExcel(filePath: string): Promise<PlayerRow[]> {
  if (!fs.existsSync(filePath)) return FALLBACK_ROWS;
  try {
    // @ts-expect-error optional dependency
    const xlsx = await import('xlsx');
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = (xlsx.utils.sheet_to_json(sheet) as any[]) || [];
    const rows: PlayerRow[] = json.map((row) => {
      const fullName = safeTrim(row['Nome e cognome'] || row['nome'] || row['full_name'] || row['Full Name']);
      const birthYear = Number(row['anno di nascita'] || row['birth_year'] || row['anno']) || null;
      const nationality = safeTrim(row['nazionalità'] || row['nazionalita'] || row['nationality']) || null;
      const sport = safeTrim(row['sport']) || 'calcio';
      const role = safeTrim(row['ruolo'] || row['role']) || null;
      const slug = normalizeSlug(fullName || row['slug'] || '');
      const email = safeTrim(row['email']) || (slug ? `${slug}@test.it` : null);
      const password = safeTrim(row['password']) || slug || null;
      return { fullName, birthYear, nationality, sport, role, email, password };
    });

    const filtered = rows.filter((r) => r.fullName);
    return filtered.length ? filtered : FALLBACK_ROWS;
  } catch (err) {
    console.warn('[seed] Impossibile leggere il file Excel, uso fallback', err);
    return FALLBACK_ROWS;
  }
}

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const filePath = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve('elenco giocatori codex.xlsx');
  const rows = await parseExcel(filePath);

  const userList = await supabase.auth.admin.listUsers({ page: 1, perPage: 2000 });
  const existingByEmail = new Map<string, string>();
  (userList.data?.users || []).forEach((u: any) => {
    if (u.email) existingByEmail.set(u.email.toLowerCase(), u.id);
  });

  for (const row of rows) {
    const fullName = row.fullName.trim();
    const slug = normalizeSlug(fullName);
    const email = (row.email || `${slug}@test.it`).toLowerCase();
    const password = row.password || slug || 'changeme';
    const birthYear = row.birthYear ?? null;
    const role = row.role || null;
    const sport = row.sport || 'calcio';
    const nationality = row.nationality || null;

    let userId = existingByEmail.get(email);

    if (!userId) {
      const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createError) {
        console.error(`[seed] errore creazione utente ${email}:`, createError.message);
        continue;
      }
      userId = createdUser.user?.id ?? null;
      if (!userId) {
        console.error(`[seed] utente ${email} non creato`);
        continue;
      }
      existingByEmail.set(email, userId);
      console.log(`[CREATO] ${fullName} -> ${email}/${password}`);
    } else {
      console.log(`[ESISTENTE] ${fullName} -> ${email}`);
    }

    const profilePayload: Record<string, any> = {
      user_id: userId,
      full_name: fullName,
      display_name: fullName,
      account_type: 'athlete',
      type: 'athlete',
      sport,
      role,
      birth_year: birthYear,
      country: nationality,
      status: 'active',
      interest_country: 'IT',
      interest_region: 'Sicilia',
      interest_province: 'Siracusa',
      interest_city: 'Carlentini',
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'user_id' });
    if (upsertError) {
      console.error(`[seed] errore upsert profilo ${email}:`, upsertError.message);
      continue;
    }
  }

  console.log('Seed completato.');
}

if (require.main === module) {
  void main();
}
