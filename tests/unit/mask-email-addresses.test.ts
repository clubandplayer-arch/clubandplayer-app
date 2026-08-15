import assert from 'node:assert/strict';
import test from 'node:test';

import { MASKED_EMAIL_ADDRESS, maskEmailAddresses } from '../../lib/privacy/maskEmailAddresses';

test('masks an email address embedded in a post or comment', () => {
  assert.equal(maskEmailAddresses('Scrivetemi su gabasso@gmail.com'), `Scrivetemi su ${MASKED_EMAIL_ADDRESS}`);
});

test('masks multiple addresses while preserving surrounding punctuation and line breaks', () => {
  assert.equal(
    maskEmailAddresses('Prima: nome.cognome+calcio@example.co.uk.\nPoi admin@societa.it!'),
    `Prima: ${MASKED_EMAIL_ADDRESS}.\nPoi ${MASKED_EMAIL_ADDRESS}!`,
  );
});

test('does not alter mentions or incomplete email-like text', () => {
  assert.equal(maskEmailAddresses('Ciao @mario, il dominio è example.com e la chiocciola è @.'), 'Ciao @mario, il dominio è example.com e la chiocciola è @.');
});
