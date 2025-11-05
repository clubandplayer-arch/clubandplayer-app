/**
 * Seed/Update utenti di test in Supabase Auth + upsert su "profiles".
 * - Crea o aggiorna password e user_metadata.role
 * - Upsert su profiles.account_type (club/athlete)
 * - Se role === 'admin': prova a impostare profiles.is_admin = true (se la colonna esiste)
 *
 * Richiede variabili d'ambiente:
 *   SUPABASE_URL=https://izzfjrcabtixxsrnkzro.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6emZqcmNhYnRpeHhzcm5renJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjEwNjkyNSwiZXhwIjoyMDcxNjgyOTI1fQ.-AC54HOVSHodaJnAIAW_5HZx14ic-akeah7uot-0wpc
 *
 * Esegui:  node scripts/seed-test-users.mjs
 */

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const ADMIN_HEADERS = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'content-type': 'application/json',
};

// Utenti da creare/aggiornare
const USERS = [
  { email: 'gabasso@gmail.com',  password: 'admincandp', role: 'admin'   },
  { email: 'club@test.it',       password: 'club',       role: 'club'    },
  { email: 'playm@test.it',      password: 'playm',      role: 'athlete' },
  { email: 'playf@test.it',      password: 'playf',      role: 'athlete' },
  { email: 'fcbasket@test.it',   password: 'fcbasket',   role: 'club'    },
  { email: 'basketm@test.it',    password: 'basketm',    role: 'athlete' },
];

// --- helpers ---------------------------------------------------------------

async function api(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: { ...(options.headers || {}), ...ADMIN_HEADERS },
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) {
    const msg = json?.msg || json?.message || json?.error_description || JSON.stringify(json);
    throw new Error(`${res.status} ${res.statusText} – ${msg}`);
  }
  return json;
}

// Admin: cerca utente per email (GoTrue)
async function findUserByEmail(email) {
  const q = new URLSearchParams({ email });
  const data = await api(`/auth/v1/admin/users?${q.toString()}`, { method: 'GET' });
  const arr = Array.isArray(data?.users) ? data.users : [];
  return arr.find(u => (u.email || '').toLowerCase() === email.toLowerCase()) || null;
}

// Admin: crea utente
async function createUser({ email, password, role }) {
  const payload = { email, password, email_confirm: true, user_metadata: { role } };
  return api('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify(payload) });
}

// Admin: aggiorna utente
async function updateUserById(id, { password, role }) {
  const payload = { password, user_metadata: { role } };
  return api(`/auth/v1/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

// Upsert su profiles (account_type)
async function upsertProfile(userId, role) {
  // mappa role → account_type
  const account_type = role === 'club' ? 'club' : role === 'athlete' ? 'athlete' : null;
  if (!account_type) return; // per admin non forziamo account_type

  const body = [{ user_id: userId, account_type }];
  const q = new URLSearchParams({ on_conflict: 'user_id' });
  await api(`/rest/v1/profiles?${q.toString()}`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(body),
  });
}

// Marca admin su profiles.is_admin (se la colonna esiste)
async function markAdminProfile(userId) {
  try {
    await api(`/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ is_admin: true }),
    });
    return true;
  } catch (e) {
    // Probabile: colonna is_admin non esiste → ignora
    if (String(e?.message || '').toLowerCase().includes('column')) return false;
    throw e;
  }
}

// --------------------------------------------------------------------------

(async () => {
  console.log('== Seed test users ==');
  for (const u of USERS) {
    try {
      // 1) create/update auth user
      let existing = await findUserByEmail(u.email);
      if (!existing) {
        console.log(`Create: ${u.email}`);
        const created = await createUser(u);
        existing = created?.user || created;
      } else {
        console.log(`Update: ${u.email} (${existing.id})`);
        await updateUserById(existing.id, u);
      }
      const uid = existing.id || existing?.user?.id;
      if (!uid) { console.warn(`No user id for ${u.email}`); continue; }

      // 2) profiles
      await upsertProfile(uid, u.role);
      if (u.role === 'admin') await markAdminProfile(uid);

      console.log(`✓ Ready: ${u.email} (role=${u.role})`);
    } catch (e) {
      console.error(`✗ Error on ${u.email}:`, e.message || e);
    }
  }

  console.log('\nDONE. Ricorda: per far passare gli endpoint admin-only subito, puoi anche impostare su Vercel:');
  console.log('  ADMIN_EMAILS=gabasso@gmail.com   (Scope: Preview, poi Redeploy)');
})();
