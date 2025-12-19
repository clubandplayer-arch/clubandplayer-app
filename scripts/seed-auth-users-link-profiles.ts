import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

type TestPlayer = {
  fullName: string;
  birthYear: number;
  nationality: string;
  sport: string;
  role: string;
};

const TEST_PLAYERS: TestPlayer[] = [
  { fullName: 'Salvatore Alicata', birthYear: 1985, nationality: 'Italia', sport: 'Calcio', role: 'Terzino/Esterno difensivo' },
  { fullName: 'Alessandro Amato', birthYear: 2003, nationality: 'Italia', sport: 'Calcio', role: 'Difensore centrale' },
  { fullName: 'Andrea Basso', birthYear: 1985, nationality: 'Italia', sport: 'Calcio', role: 'Seconda Punta' },
  { fullName: 'Sigismondo Bonomo', birthYear: 1989, nationality: 'Italia', sport: 'Calcio', role: 'Portiere' },
  { fullName: 'Ferdinando Briganti', birthYear: 1986, nationality: 'Italia', sport: 'Calcio', role: 'Centrocampista centrale' },
  { fullName: 'Andrea Carlentini', birthYear: 2008, nationality: 'Italia', sport: 'Calcio', role: 'Portiere' },
  { fullName: 'Kevin Carpinteri', birthYear: 1997, nationality: 'Italia', sport: 'Calcio', role: 'Trequartista' },
  { fullName: 'Sebastiano Costantino', birthYear: 1987, nationality: 'Italia', sport: 'Calcio', role: 'Punta Centrale' },
  { fullName: 'Salvatore Crisci', birthYear: 2003, nationality: 'Italia', sport: 'Calcio', role: 'Trequartista' },
  { fullName: "Alessandro D'Aranno", birthYear: 1984, nationality: 'Italia', sport: 'Calcio', role: 'Punta Centrale' },
  { fullName: 'Salvatore Di Domenico', birthYear: 2003, nationality: 'Italia', sport: 'Calcio', role: 'Esterno offensivo/Ala' },
  { fullName: 'Ciao Di Mari', birthYear: 1987, nationality: 'Italia', sport: 'Calcio', role: 'Terzino/Esterno difensivo' },
  { fullName: 'Marco Ganci', birthYear: 1985, nationality: 'Italia', sport: 'Calcio', role: 'Portiere' },
  { fullName: 'Rosario Gibilisco', birthYear: 2002, nationality: 'Italia', sport: 'Calcio', role: 'Esterno offensivo/Ala' },
  { fullName: 'Simone Londra', birthYear: 2007, nationality: 'Italia', sport: 'Calcio', role: 'Portiere' },
  { fullName: 'Carmelo Longo', birthYear: 1987, nationality: 'Italia', sport: 'Calcio', role: 'Esterno offensivo/Ala' },
  { fullName: 'Matteo Mangano', birthYear: 2005, nationality: 'Italia', sport: 'Calcio', role: 'Centrocampista centrale' },
  { fullName: 'Salvatore Marchese', birthYear: 2001, nationality: 'Italia', sport: 'Calcio', role: 'Terzino/Esterno difensivo' },
  { fullName: 'Mattia Marino', birthYear: 2005, nationality: 'Italia', sport: 'Calcio', role: 'Difensore centrale' },
  { fullName: 'Domenico Marturana', birthYear: 1989, nationality: 'Italia', sport: 'Calcio', role: 'Punta Centrale' },
  { fullName: 'Davide Modica', birthYear: 1985, nationality: 'Italia', sport: 'Calcio', role: 'Centrocampista centrale' },
  { fullName: 'Stefano Nanfitò', birthYear: 1982, nationality: 'Italia', sport: 'Calcio', role: 'Difensore centrale' },
  { fullName: 'Enrico Ricceri', birthYear: 1998, nationality: 'Italia', sport: 'Calcio', role: 'Centrocampista centrale' },
  { fullName: 'Manlio Rossitto', birthYear: 1985, nationality: 'Italia', sport: 'Calcio', role: 'Difensore centrale' },
  { fullName: 'Mirko Rossitto', birthYear: 1987, nationality: 'Italia', sport: 'Calcio', role: 'Difensore centrale' },
  { fullName: 'Ibrahim Sanoh', birthYear: 2007, nationality: 'Italia', sport: 'Calcio', role: 'Esterno offensivo/Ala' },
  { fullName: 'Sergio Scaparra', birthYear: 1982, nationality: 'Italia', sport: 'Calcio', role: 'Terzino/Esterno difensivo' },
  { fullName: 'Samuele Sfilio', birthYear: 2002, nationality: 'Italia', sport: 'Calcio', role: 'Centrocampista centrale' },
  { fullName: 'Anthony Sgroi', birthYear: 2004, nationality: 'Italia', sport: 'Calcio', role: 'Terzino/Esterno difensivo' },
  { fullName: 'Lorenzo Sgroi', birthYear: 2005, nationality: 'Italia', sport: 'Calcio', role: 'Centrocampista centrale' },
  { fullName: 'Omar Sidibe', birthYear: 2008, nationality: 'Italia', sport: 'Calcio', role: 'Centrocampista centrale' },
];

function slugify(input: string) {
  const noAccents = input.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return noAccents.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

async function findUserIdByEmail(admin: any, email: string) {
  const { data, error } = await admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const found = (data?.users ?? []).find((u: any) => (u.email ?? '').toLowerCase() === email.toLowerCase());
  return found?.id ?? null;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing env: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const p of TEST_PLAYERS) {
    const slug = slugify(p.fullName);
    const email = `${slug}@test.it`;
    const password = slug;

    const { data: prof, error: profErr } = await supabase
      .from('profiles')
      .select('id,user_id,full_name,display_name,type')
      .eq('type', 'athlete')
      .eq('full_name', p.fullName)
      .maybeSingle();

    if (profErr) throw profErr;
    if (!prof) {
      console.warn(`[SKIP] Profilo non trovato in profiles: "${p.fullName}"`);
      continue;
    }

    let userId: string | null = prof.user_id ?? null;

    if (!userId) {
      const created = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: p.fullName, type: 'athlete' },
      });

      if (created.error) {
        userId = await findUserIdByEmail(supabase.auth.admin, email);
        if (!userId) {
          console.warn(`[FAIL] Impossibile creare o trovare Auth user per ${email}: ${created.error.message}`);
          continue;
        }
      } else {
        userId = created.data.user?.id ?? null;
      }
    }

    if (!userId) {
      console.warn(`[FAIL] userId mancante per ${p.fullName}`);
      continue;
    }

    const interestUpdate: Record<string, any> = {
      interest_country: 'IT',
      interest_region: 'Sicilia',
      interest_province: 'Siracusa',
      interest_city: 'Carlentini',
    };

    const { error: updErr } = await supabase
      .from('profiles')
      .update({
        user_id: userId,
        display_name: prof.display_name || p.fullName,
        ...interestUpdate,
      })
      .eq('id', prof.id);

    if (updErr) throw updErr;

    console.log(`[OK] ${p.fullName} -> ${email} / ${password} (linked user_id=${userId})`);
  }

  console.log('DONE');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
