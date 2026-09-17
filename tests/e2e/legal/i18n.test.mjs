import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TestRenderer, { act } from 'react-test-renderer';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const project = process.cwd();
const cache = new Map();
const browser = {
  documentElement: { lang: 'it' }, cookie: '',
  addEventListener() {}, removeEventListener() {},
};
const state = { serverLocale: 'it', refreshes: 0, reloads: 0, authFailure: false };
const storage = new Map();
const browserWindow = { location: { reload: () => state.reloads++ }, navigator: {} };
const compilerOptions = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true };

// Keep the real provider, translations, selector and React rendering. Replace
// only Next navigation and external auth so this test never contacts a service.
function load(request, parent = project) {
  if (request === 'next/navigation') return { useRouter: () => ({ refresh: () => state.refreshes++ }) };
  if (request === '@/lib/i18n/server') return { resolveRequestLocale: async () => state.serverLocale };
  if (request === '@/lib/supabaseBrowser') return { supabaseBrowser: () => ({ auth: { getUser: async () => {
    if (state.authFailure) throw new Error('Simulated preference failure');
    return { data: { user: null } };
  } } }) };
  if (!request.startsWith('.') && !request.startsWith('@/') && !path.isAbsolute(request)) return require(request);
  const base = request.startsWith('@/') ? path.join(project, request.slice(2)) : path.resolve(parent, request);
  const filename = [base, base + '.ts', base + '.tsx', path.join(base, 'index.ts')].find((candidate) => /\.(ts|tsx)$/.test(candidate) && existsSync(candidate));
  assert.ok(filename, `Module not found: ${request}`);
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiledModule = { exports: {} };
  cache.set(filename, compiledModule);
  const { outputText, diagnostics } = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions, reportDiagnostics: true });
  assert.equal(diagnostics.length, 0, filename);
  new Function('require', 'module', 'exports', 'document', 'window', 'location', 'localStorage', outputText)(
    (id) => load(id, path.dirname(filename)), compiledModule, compiledModule.exports,
    browser, browserWindow, { protocol: 'https:' }, {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
  );
  return compiledModule.exports;
}

const { I18nProvider } = load('@/components/i18n/I18nProvider');
const { legalCopy } = load('@/lib/i18n/legal');
const { loadMessages } = load('@/lib/i18n/messages');
const documents = [
  ['privacy', 'PrivacyDocument', 'text01'], ['terms', 'TermsDocument', 'text01'],
  ['beta', 'BetaDocument', 'text09'], ['childSafety', 'ChildSafetyDocument', 'text01'],
].map(([key, name, titleKey]) => ({ key, titleKey, Component: load(`@/components/legal/documents/${name}`).default }));
const normalize = (text) => text.replace(/\s+/g, ' ').trim();
function textOf(node) {
  if (typeof node === 'string') return node;
  if (!node) return '';
  if (Array.isArray(node)) return node.map(textOf).join('');
  return (node.children ?? []).map(textOf).join('');
}

test('complete translation catalogs share the Italian source structure', () => {
  for (const locale of ['it', 'en', 'fr', 'es']) {
    assert.deepEqual(Object.keys(legalCopy[locale]), Object.keys(legalCopy.it));
    for (const section of Object.keys(legalCopy.it)) {
      assert.deepEqual(Object.keys(legalCopy[locale][section]), Object.keys(legalCopy.it[section]));
      assert.ok(Object.values(legalCopy[locale][section]).every((text) => typeof text === 'string' && text.trim()));
    }
    assert.ok(!JSON.stringify(legalCopy[locale]).includes('privacy@clubandplayer.com'));
  }
});

for (const locale of ['it', 'en', 'fr', 'es']) {
  for (const { key, titleKey, Component } of documents) {
    test(`${key}: server HTML and metadata use ${locale}`, async () => {
      const messages = await loadMessages(locale);
      const html = renderToStaticMarkup(React.createElement(I18nProvider, { initialLocale: locale, initialMessages: messages }, React.createElement(Component)));
      assert.ok(html.includes(`lang="${locale}"`));
      assert.ok(html.includes(legalCopy[locale][key][titleKey]));
      assert.ok(html.includes('dateTime="2026-09-17"'));
      const slug = key === 'childSafety' ? 'child-safety' : key;
      state.serverLocale = locale;
      const metadata = await load(`@/app/legal/${slug}/page`).generateMetadata();
      assert.equal(metadata.title, legalCopy[locale][key].metaTitle);
      assert.equal(metadata.description, legalCopy[locale][key].metaDescription);
      assert.equal(metadata.alternates.canonical, `/legal/${slug}`);
    });
  }
}

test('the existing selector updates all four mounted pages without a reload', async () => {
  // Give the client renderer its own context instance after the SSR checks.
  cache.clear();
  const { I18nProvider } = load('@/components/i18n/I18nProvider');
  const Selector = load('@/components/i18n/LanguageSwitcher').default;
  const CookieBanner = load('@/components/misc/CookieConsent').default;
  const mountedDocuments = documents.map((document) => ({
    ...document,
    Component: load(`@/components/legal/documents/${document.Component.name}`).default,
  }));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let renderer;
  try {
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(I18nProvider, { initialLocale: 'it', initialMessages: await loadMessages('it') },
        React.createElement(React.Fragment, null,
          React.createElement(Selector), React.createElement(CookieBanner),
          ...mountedDocuments.map(({ key, Component }) => React.createElement(Component, { key })),
        ),
      ));
    });
    for (const [locale, label] of [['en', 'English'], ['fr', 'Français'], ['es', 'Español'], ['it', 'Italiano']]) {
      await act(async () => renderer.root.findByProps({ 'aria-haspopup': 'menu' }).props.onClick());
      await act(async () => {
        renderer.root.findAllByProps({ role: 'menuitemradio' }).find((item) => item.children[0] === label).props.onClick();
        await new Promise((resolve) => setImmediate(resolve));
      });
      const mains = renderer.root.findAllByType('main');
      assert.equal(mains.length, 4);
      for (const [i, { key, titleKey }] of documents.entries()) {
        assert.equal(mains[i].props.lang, locale);
        assert.equal(mains[i].findByType('h1').children.join(''), legalCopy[locale][key][titleKey]);
        const content = normalize(textOf(mains[i]));
        for (const [id, text] of Object.entries(legalCopy[locale][key])) {
          if (id.startsWith('text')) assert.ok(content.includes(normalize(text)), `${locale}/${key}/${id}`);
        }
        assert.equal(mains[i].findByType('time').props.dateTime, '2026-09-17');
      }
      assert.ok(renderer.root.findAllByType('button').some((button) => button.children.includes(legalCopy[locale].common.cookiePreferences)));
      assert.ok(renderer.root.findAllByType('button').some((button) => button.children.includes(legalCopy[locale].common.cookieAccept)));
      assert.equal(browser.documentElement.lang, locale);
      assert.ok(browser.cookie.startsWith(`cp_locale=${locale};`));
      assert.equal(state.reloads, 0);
    }
    // A failed saved preference must roll the documents back with the selector.
    state.authFailure = true;
    await act(async () => renderer.root.findByProps({ 'aria-haspopup': 'menu' }).props.onClick());
    await act(async () => {
      renderer.root.findAllByProps({ role: 'menuitemradio' }).find((item) => item.children[0] === 'English').props.onClick();
      await new Promise((resolve) => setImmediate(resolve));
    });
    assert.ok(renderer.root.findAllByType('main').every((main) => main.props.lang === 'it'));
    assert.equal(state.reloads, 0);
  } finally {
    state.authFailure = false;
    if (renderer) await act(async () => renderer.unmount());
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
