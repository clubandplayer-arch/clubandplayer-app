import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

const HOST = process.env.E2E_HOST ?? '127.0.0.1';
const PORT = Number(process.env.E2E_PORT ?? 3010);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://${HOST}:${PORT}`;
const START_TIMEOUT_MS = Number(process.env.E2E_START_TIMEOUT ?? 120_000);

async function waitForServer(signal) {
  const deadline = Date.now() + START_TIMEOUT_MS;
  const urlsToProbe = [
    `${BASE_URL}/api/health`,
    `${BASE_URL}/`,
  ];

  while (Date.now() < deadline && !signal.aborted) {
    for (const url of urlsToProbe) {
      try {
        const resp = await fetch(url, { redirect: 'manual' });
        if (resp.ok || (resp.status >= 300 && resp.status < 400)) {
          return;
        }
      } catch (error) {
        if (signal.aborted) {
          throw new Error('Server start aborted', { cause: error });
        }
      }
    }

    await delay(500, undefined, { signal }).catch((err) => {
      if (!signal.aborted) throw err;
    });
  }

  throw new Error(`Next.js dev server non raggiungibile su ${BASE_URL} entro ${START_TIMEOUT_MS}ms`);
}

export async function startServer() {
  const controller = new AbortController();
  const child = spawn('pnpm', ['exec', 'next', 'dev', '--turbopack', '--hostname', HOST, '--port', String(PORT)], {
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[next] ${chunk}`);
  });
  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[next:err] ${chunk}`);
  });

  const exitPromise = once(child, 'exit');

  const waitPromise = waitForServer(controller.signal).catch(async (error) => {
    controller.abort();
    if (!child.killed) {
      child.kill('SIGTERM');
      await delay(2_000).catch(() => {});
      if (!child.killed) child.kill('SIGKILL');
    }
    throw error;
  });

  await waitPromise;

  async function stop() {
    controller.abort();
    if (!child.killed) {
      child.kill('SIGTERM');
      const race = Promise.race([
        exitPromise.then(() => undefined),
        delay(5_000).then(() => {
          if (!child.killed) child.kill('SIGKILL');
        }),
      ]);
      await race;
    }
  }

  return { baseURL: BASE_URL, stop };
}
