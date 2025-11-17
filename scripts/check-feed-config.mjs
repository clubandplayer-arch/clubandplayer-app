#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Errore: variabili mancanti (${missing.join(', ')})`.trim());
  console.error('Imposta SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY prima di eseguire il check.');
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false } });

async function main() {
  console.log('== Check feed/storage Supabase ==');
  console.log(`URL: ${url}`);

  const { data: buckets, error: bucketErr } = await admin.storage.listBuckets();
  if (bucketErr) {
    console.error('Errore nel recupero bucket Storage:', bucketErr.message);
    process.exit(1);
  }
  const bucketNames = new Set((buckets || []).map((b) => b.name));
  const hasPostsBucket = bucketNames.has('posts');
  console.log(`Bucket posts: ${hasPostsBucket ? 'OK' : 'ASSENTE'}`);
  if (!hasPostsBucket) {
    console.error('Manca il bucket "posts" per la bacheca: crealo o aggiorna la migrazione Supabase.');
  }

  const { error: tableErr } = await admin.from('posts').select('id', { count: 'exact', head: true }).limit(1);
  if (tableErr) {
    console.error('Errore nel leggere la tabella posts con service-role:', tableErr.message);
    console.error('Controlla migrazioni, RLS o permessi del servizio.');
    process.exit(1);
  }
  console.log('Tabella posts accessibile con service-role.');

  if (!hasPostsBucket) {
    process.exit(1);
  }
  console.log('Check concluso.');
}

main().catch((err) => {
  console.error('Errore inatteso:', err?.message || err);
  process.exit(1);
});
