/* eslint-env node */
/**
 * Crea/aggiorna due account di TEST per QA e demo:
 *   1) club@test.it / password "club"  → account_type=club
 *   2) playm@test.it / password "playm" → account_type=athlete
 *
 * Richiede variabili d'ambiente:
 *   SUPABASE_URL=https://<project-ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
 *
 * Esegui:
 *   node scripts/create-test-users.mjs
 *
 * Note:
 * - Gli account vengono marcati come email_confirmed per evitare il flusso di verifica email.
 * - I profili vengono creati/aggiornati con status=active e campi visibili in feed/search-map.
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

const TEST_USERS = [
  {
    email: 'club@test.it',
    password: 'club',
    profile: {
      account_type: 'club',
      type: 'club',
      status: 'active',
      display_name: 'Club Test',
      full_name: 'Club Test',
      headline: 'Club demo per QA',
      city: 'Milano',
      country: 'IT',
      sport: 'Calcio',
      role: 'Club',
    },
  },
  {
    email: 'playm@test.it',
    password: 'playm',
    profile: {
      account_type: 'athlete',
      type: 'athlete',
      status: 'active',
      display_name: 'Play M (Test)',
      full_name: 'Play M',
      headline: 'Atleta demo per QA',
      city: 'Torino',
      country: 'IT',
      sport: 'Basket',
      role: 'Playmaker',
    },
  },
];

async function api(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: { ...(options.headers || {}), ...ADMIN_HEADERS },
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const msg = json?.msg || json?.message || json?.error_description || JSON.stringify(json);
    throw new Error(`${res.status} ${res.statusText} – ${msg}`);
  }
  return json;
}

async function findUserByEmail(email) {
  const q = new URLSearchParams({ email });
  const data = await api(`/auth/v1/admin/users?${q.toString()}`, { method: 'GET' });
  const arr = Array.isArray(data?.users) ? data.users : [];
  return arr.find(u => (u.email || '').toLowerCase() === email.toLowerCase()) || null;
}

async function createUser({ email, password }) {
  const payload = { email, password, email_confirm: true };
  return api('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify(payload) });
}

async function updateUserById(id, { password }) {
  const payload = { password };
  return api(`/auth/v1/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

async function fetchProfile(userId) {
  const filter = encodeURIComponent(`id.eq.${userId},user_id.eq.${userId}`);
  const url = `/rest/v1/profiles?or=(${filter})&limit=1`;
  const data = await api(url, { method: 'GET' });
  return Array.isArray(data) && data.length ? data[0] : null;
}

async function upsertProfile(userId, email, payload) {
  const existing = await fetchProfile(userId);
  const base = { ...payload, email };

  if (existing) {
    const column = existing.user_id ? 'user_id' : 'id';
    const url = `/rest/v1/profiles?${column}=eq.${encodeURIComponent(userId)}`;
    await api(url, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(base),
    });
    return { action: 'updated', column };
  }

  const insertPayload = { id: userId, user_id: userId, ...base };
  await api('/rest/v1/profiles', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(insertPayload),
  });
  return { action: 'inserted', column: 'id|user_id' };
}

(async () => {
  try {
    for (const user of TEST_USERS) {
      let authUser = await findUserByEmail(user.email);
      if (!authUser) {
        console.log(`Create auth user: ${user.email}`);
        const created = await createUser(user);
        authUser = created?.user || created;
      } else {
        console.log(`Update auth user: ${user.email} (${authUser.id})`);
        await updateUserById(authUser.id, user);
      }

      const uid = authUser.id || authUser?.user?.id;
      if (!uid) throw new Error(`User ID non trovato per ${user.email}`);

      const { action } = await upsertProfile(uid, user.email, user.profile);
      console.log(`✓ Profile ${action}: ${user.email} (id=${uid})`);
    }

    console.log('✓ Account di test pronti. Puoi usare le credenziali specificate per il login in dev/staging.');
  } catch (e) {
    console.error('✗ Errore:', e.message || e);
    process.exit(1);
  }
})();
