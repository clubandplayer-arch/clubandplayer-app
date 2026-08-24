import test from 'node:test';
import assert from 'node:assert/strict';

import { localizeAccountType, localizeControlledStatus, localizeSportRole } from '../../lib/i18n/controlledVocabulary';
import it from '../../lib/i18n/messages/it';
import en from '../../lib/i18n/messages/en';
import fr from '../../lib/i18n/messages/fr';
import es from '../../lib/i18n/messages/es';

const locales = { it, en, fr, es } as const;
const translator = (messages: Record<keyof typeof it, string>) => (key: keyof typeof it) => messages[key];

test('localizza i principali ruoli sportivi senza cambiare il valore persistito', () => {
  const expected = {
    it: ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante', 'Esterno / Ala', 'Punta centrale', 'Centrocampista centrale'],
    en: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Winger', 'Centre-forward', 'Central midfielder'],
    fr: ['Gardien', 'Défenseur', 'Milieu de terrain', 'Attaquant', 'Ailier', 'Avant-centre', 'Milieu central'],
    es: ['Portero', 'Defensa', 'Centrocampista', 'Delantero', 'Extremo', 'Delantero centro', 'Centrocampista central'],
  } as const;
  const persisted = ['goalkeeper', 'defender', 'midfielder', 'forward', 'esterno', 'Punta Centrale', 'Centrocampista centrale'];
  for (const locale of Object.keys(locales) as Array<keyof typeof locales>) {
    assert.deepEqual(persisted.map((value) => localizeSportRole(value, translator(locales[locale]))), expected[locale]);
  }
  assert.equal(persisted[5], 'Punta Centrale');
  assert.equal(localizeSportRole('Ruolo libero', translator(en)), 'Ruolo libero');
});

test('localizza account type e alias athlete/player in ogni lingua', () => {
  const expected = {
    it: ['Giocatore', 'Giocatore', 'Club', 'Staff', 'Tifoso', 'Ente / Federazione'],
    en: ['Player', 'Player', 'Club', 'Staff', 'Fan', 'Institution / Federation'],
    fr: ['Joueur', 'Joueur', 'Club', 'Staff', 'Supporter', 'Institution / Fédération'],
    es: ['Jugador', 'Jugador', 'Club', 'Cuerpo técnico', 'Aficionado', 'Institución / Federación'],
  } as const;
  const values = ['athlete', 'player', 'club', 'staff', 'fan', 'institution'];
  for (const locale of Object.keys(locales) as Array<keyof typeof locales>) {
    assert.deepEqual(values.map((value) => localizeAccountType(value, translator(locales[locale]))), expected[locale]);
  }
});

test('localizza gli status controllati e i relativi alias legacy', () => {
  const values = ['open', 'closed', 'pending', 'in_review', 'accepted', 'rejected', 'follow', 'following'];
  assert.deepEqual(values.map((value) => localizeControlledStatus(value, translator(en))), ['Open', 'Closed', 'Pending', 'Under review', 'Accepted', 'Rejected', 'Follow', 'Following']);
  assert.deepEqual(values.map((value) => localizeControlledStatus(value, translator(fr))), ['Ouvert', 'Fermé', 'En attente', 'En cours d’évaluation', 'Acceptée', 'Refusée', 'Suivre', 'Abonné']);
  assert.deepEqual(values.map((value) => localizeControlledStatus(value, translator(es))), ['Abierto', 'Cerrado', 'Pendiente', 'En evaluación', 'Aceptada', 'Rechazada', 'Seguir', 'Siguiendo']);
  assert.equal(localizeControlledStatus('accettata', translator(en)), 'Accepted');
  assert.equal(localizeControlledStatus('stato_personalizzato', translator(fr)), 'stato_personalizzato');
});

test('i quattro dizionari hanno parità per il vocabolario controllato', () => {
  const vocabularyKeys = Object.keys(it).filter((key) => key.startsWith('vocabulary.')).sort();
  assert.ok(vocabularyKeys.length > 0);
  for (const messages of Object.values(locales)) {
    assert.deepEqual(Object.keys(messages).filter((key) => key.startsWith('vocabulary.')).sort(), vocabularyKeys);
  }
});
