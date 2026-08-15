import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MASKED_EMAIL_ADDRESS,
  MASKED_PHONE_NUMBER,
  maskContactInfo,
} from '../../lib/privacy/maskContactInfo';

test('masks an email address embedded in a post or comment', () => {
  assert.equal(maskContactInfo('Scrivetemi su gabasso@gmail.com'), `Scrivetemi su ${MASKED_EMAIL_ADDRESS}`);
});

test('masks multiple addresses while preserving surrounding punctuation and line breaks', () => {
  assert.equal(
    maskContactInfo('Prima: nome.cognome+calcio@example.co.uk.\nPoi admin@societa.it!'),
    `Prima: ${MASKED_EMAIL_ADDRESS}.\nPoi ${MASKED_EMAIL_ADDRESS}!`,
  );
});

test('does not alter mentions or incomplete email-like text', () => {
  assert.equal(maskContactInfo('Ciao @mario, il dominio è example.com e la chiocciola è @.'), 'Ciao @mario, il dominio è example.com e la chiocciola è @.');
});

test('masks Italian mobile numbers with a country code and common separators', () => {
  for (const phone of ['+39.3929874489', '+393658965417', '+39 392 987 4489', '+39-392-987-4489']) {
    assert.equal(maskContactInfo(`Chiamami al ${phone}.`), `Chiamami al ${MASKED_PHONE_NUMBER}.`);
  }
});

test('masks Italian mobile numbers without a country code', () => {
  for (const phone of ['3254169984', '362 963 55 69', '392.987.4489', '392-987-4489']) {
    assert.equal(maskContactInfo(`Numero: ${phone}`), `Numero: ${MASKED_PHONE_NUMBER}`);
  }
});

test('masks email addresses and phone numbers in the same text', () => {
  assert.equal(
    maskContactInfo('Email: atleta@example.it, telefono: +39 392 987 4489'),
    `Email: ${MASKED_EMAIL_ADDRESS}, telefono: ${MASKED_PHONE_NUMBER}`,
  );
});

test('does not mask dates, years, scores, or numeric identifiers', () => {
  assert.equal(
    maskContactInfo('Partita 12/08/2026, risultato 3-2, tessera 1234567890.'),
    'Partita 12/08/2026, risultato 3-2, tessera 1234567890.',
  );
});
