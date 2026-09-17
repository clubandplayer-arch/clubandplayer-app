import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const italianModule = { exports: {} };
new Function('exports', ts.transpileModule(readFileSync('lib/i18n/legal/it.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(italianModule.exports);

// Execute the actual components with a minimal browser/hook harness.
function loadComponent(file, browser, state = false) {
  const effects = [];
  const states = [];
  const hooks = {
    useEffect: (effect) => effects.push(effect),
    useState: () => [state, (value) => states.push(value)],
  };
  const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
  });
  const compiledModule = { exports: {} };
  new Function('require', 'module', 'exports', 'window', 'document', 'localStorage', 'process', outputText)(
    (id) => {
      if (id === 'react') return hooks;
      if (id === '@/components/i18n/I18nProvider') return { useI18n: () => ({ locale: 'it', t: (key) => key }) };
      if (id === '@/lib/i18n/legal') return { legalCopy: { it: italianModule.exports.default } };
      return require(id);
    }, compiledModule, compiledModule.exports,
    browser.window, browser.document, browser.storage,
    { env: { NEXT_PUBLIC_ANALYTICS_DOMAIN: 'clubandplayer.com' } },
  );
  return { component: compiledModule.exports.default, effects, states };
}

function makeBrowser(consent, dnt = '0') {
  const saved = new Map(consent ? [['cp-consent-v1', JSON.stringify({ consent })]] : []);
  const scripts = [];
  const browser = {
    reloads: 0,
    scripts,
    storage: {
      getItem: (key) => saved.get(key) ?? null,
      setItem: (key, value) => saved.set(key, value),
      removeItem: (key) => saved.delete(key),
    },
    document: {
      createElement: () => ({ setAttribute() {} }),
      head: { appendChild: (el) => scripts.push(el), removeChild: (el) => scripts.splice(scripts.indexOf(el), 1) },
    },
  };
  browser.window = { navigator: { doNotTrack: dnt }, location: { reload: () => browser.reloads++ } };
  return browser;
}

function buttons(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(buttons);
  return [...(node.type === 'button' ? [node] : []), ...buttons(node.props?.children)];
}

for (const [choice, dnt, expected] of [[null, '0', 0], ['necessary', '0', 0], ['all', '1', 0], ['all', '0', 1]]) {
  test(`analytics consent=${choice}, DNT=${dnt}: ${expected} script`, () => {
    const browser = makeBrowser(choice, dnt);
    const loaded = loadComponent('components/analytics/PrivacyAnalytics.tsx', browser);
    loaded.component();
    const cleanup = loaded.effects[0]();
    assert.equal(browser.scripts.length, expected);
    cleanup?.();
    assert.equal(browser.scripts.length, 0);
  });
}

for (const [index, expected] of [[0, 'all'], [1, 'necessary']]) {
  test(`banner saves ${expected} and reloads to apply the choice`, () => {
    const browser = makeBrowser(null);
    const loaded = loadComponent('components/misc/CookieConsent.tsx', browser, true);
    buttons(loaded.component())[index].props.onClick();
    assert.equal(JSON.parse(browser.storage.getItem('cp-consent-v1')).consent, expected);
    assert.equal(browser.reloads, 1);
  });
}

test('revoking consent reloads the page and prevents the next analytics load', () => {
  const browser = makeBrowser('all');
  const preferences = loadComponent('components/legal/CookiePreferencesButton.tsx', browser);
  buttons(preferences.component())[0].props.onClick();
  assert.equal(browser.storage.getItem('cp-consent-v1'), null);
  assert.equal(browser.reloads, 1);
  const analytics = loadComponent('components/analytics/PrivacyAnalytics.tsx', browser);
  analytics.component();
  analytics.effects[0]();
  assert.equal(browser.scripts.length, 0);
});

test('storage failure does not accept consent or reload in a loop', () => {
  const browser = makeBrowser(null);
  browser.storage.setItem = () => { throw new Error('Storage unavailable'); };
  const loaded = loadComponent('components/misc/CookieConsent.tsx', browser, true);
  buttons(loaded.component())[0].props.onClick();
  assert.equal(browser.reloads, 0);
  assert.equal(browser.storage.getItem('cp-consent-v1'), null);
  assert.deepEqual(loaded.states, [true]);
});
