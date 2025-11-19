#!/usr/bin/env node

const requiredEnv = ['RESEND_API_KEY', 'RESEND_FROM', 'BRAND_REPLY_TO'];
const missing = requiredEnv.filter((key) => !process.env[key]);

console.log('== Check configurazione email Resend ==');

if (missing.length) {
  console.error(`Errore: mancano variabili richieste (${missing.join(', ')})`);
  console.error('Imposta RESEND_API_KEY, RESEND_FROM e BRAND_REPLY_TO per inviare email reali.');
  process.exit(1);
}

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey.startsWith('re_')) {
  console.warn('Nota: RESEND_API_KEY non sembra avere il prefisso "re_" tipico delle chiavi Resend.');
}

const from = process.env.RESEND_FROM;
if (!from.includes('@')) {
  console.warn('Nota: RESEND_FROM non contiene un indirizzo email.');
}

console.log('Configurazione base presente: puoi testare /api/notify-email e /api/notifications/send in ambiente protetto.');
