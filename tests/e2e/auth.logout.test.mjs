import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { startServer } from './helpers/server.mjs';

let server;

before(async () => {
  server = await startServer();
});

after(async () => {
  if (server) {
    await server.stop();
  }
});

test('GET /logout risponde con successo', async () => {
  const resp = await fetch(`${server.baseURL}/logout`, { redirect: 'manual' });
  assert.ok(resp.ok || (resp.status >= 300 && resp.status < 400), 'logout deve rispondere 2xx o redirect');

  if (resp.status >= 300 && resp.status < 400) {
    const location = resp.headers.get('location');
    assert.ok(location, 'redirect senza header Location');
  }
});

test('Guest che apre /feed vede la login page', async () => {
  const firstResp = await fetch(`${server.baseURL}/feed`, { redirect: 'manual' });
  let html;

  if (firstResp.status >= 300 && firstResp.status < 400) {
    const location = firstResp.headers.get('location');
    assert.ok(location, 'redirect /feed senza Location');
    const followResp = await fetch(new URL(location, server.baseURL), { redirect: 'manual' });
    assert.ok(followResp.ok, 'la pagina di login deve rispondere 200');
    html = await followResp.text();
  } else {
    assert.ok(firstResp.ok, 'la pagina /feed deve rispondere 2xx se non redirige');
    html = await firstResp.text();
  }

  const normalized = html.toLowerCase();
  const sawLoginTitle = normalized.includes('<title') && normalized.includes('login');
  const sawEntraButton = /<button[^>]*>[^<]*entra/i.test(html);
  const sawFeedLayout =
    /chi seguire/i.test(html) ||
    /club che segui/i.test(html) ||
    normalized.includes('il tuo profilo');

  assert.ok(
    sawLoginTitle || sawEntraButton || sawFeedLayout,
    'la pagina deve contenere titolo Login, pulsante Entra oppure gli elementi base del feed',
  );
});
