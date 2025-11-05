/* eslint-env node */
/* global fetch, URLSearchParams */
/* eslint-disable no-console */
/**
 * Crea/aggiorna l'utente admin:
 *   email: gabasso@gmail.com
 *   password: admincandp
 *   user_metadata.role = 'admin'
 *   profiles.is_admin = true (se la colonna esiste)
 *
 * Richiede env:
 *   SUPABASE_URL=https://<project-ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
 *
 * Esegui: node scripts/create-admin-user.mjs
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

const ADMIN = { email: 'gabasso@gmail.com', password: 'admincandp', role: 'admin' };

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

async function findUserByEmail(email) {
  const q = new URLSearchParams({ email });
  const data = await api(`/auth/v1/admin/users?${q.toString()}`, { method: 'GET' });
  const arr = Array.isArray(data?.users) ? data.users : [];
  return arr.find(u => (u.email || '').toLowerCase() === email.toLowerCase()) || null;
}

async function createUser({ email, password, role }) {
  const payload = { email, password, email_confirm: true, user_metadata: { role } };
  return api('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify(payload) });
}

async function updateUserById(id, { password, role }) {
  const payload = { password, user_metadata: { role } };
  return api(`/auth/v1/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

// Prova a patchare profiles usando user_id; se fallisce, riprova con id
async function ensureProfileAdmin(userId) {
  // prova user_id
  try {
    await api(`/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ is_admin: true }),
    });
    return;
  } catch (e) {
    // se la colonna user_id non esiste, prova id
    if (!String(e?.message || '').toLowerCase().includes('column')) throw e;
  }
  // fallback: prova con id
  await api(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ is_admin: true }),
  });
}

(async () => {
  try {
    let user = await findUserByEmail(ADMIN.email);
    if (!user) {
      console.log(`Create: ${ADMIN.email}`);
      const created = await createUser(ADMIN);
      user = created?.user || created;
    } else {
      console.log(`Update: ${ADMIN.email} (${user.id})`);
      await updateUserById(user.id, ADMIN);
    }
    const uid = user.id || user?.user?.id;
    if (!uid) throw new Error('User ID non trovato');

    await ensureProfileAdmin(uid);
    console.log(`✓ Admin pronto: ${ADMIN.email} (id=${uid})`);
    console.log('Ora puoi fare login con email/password e risultare admin.');
  } catch (e) {
    console.error('✗ Errore:', e.message || e);
    process.exit(1);
  }
})();
