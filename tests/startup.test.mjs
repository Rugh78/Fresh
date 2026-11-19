import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const lifecycle = html.slice(html.indexOf('let appStartupComplete = false;'), html.indexOf("document.addEventListener('click'"));

function startup({ search = '', stored = null } = {}) {
  const elements = {};
  const opened = [];
  const pages = [];
  let authChanged;
  let authError;
  let rejectSignIn;
  let signIns = 0;
  let timeout;
  const context = vm.createContext({
    URLSearchParams,
    console: { error() {} },
    applyDark() {},
    window: { location: { search } },
    localStorage: { getItem: () => stored },
    document: { getElementById(id) { return elements[id] ||= { hidden: false, setAttribute() {} }; } },
    showPage: id => pages.push(id),
    enterList: id => opened.push(id),
    setTimeout: callback => { timeout = callback; return 1; },
    clearTimeout() { timeout = null; },
    firebase: { auth: () => ({
      onAuthStateChanged(callback, error) { authChanged = callback; authError = error; },
      signInAnonymously() { signIns++; return new Promise((resolve, reject) => { rejectSignIn = reject; }); }
    }) }
  });
  vm.runInContext(lifecycle, context);
  return { elements, opened, pages, auth: user => authChanged(user), error: () => authError(new Error()),
    deny: async () => { rejectSignIn({ code: 'auth/network-request-failed' }); await Promise.resolve(); },
    expire: () => timeout(), get signIns() { return signIns; } };
}

test('first paint shows startup instead of create/join controls', () => {
  assert.match(html, /id="startup" class="page active"/);
  assert.match(html, /id="landing" class="page"/);
  assert.match(html, /#startup \[hidden\] \{ display:none; \}/);
});

test('a saved list opens directly after authentication, without the landing page', () => {
  const s = startup({ stored: 'exnu22' });
  assert.deepEqual(s.pages, []);
  assert.deepEqual(s.opened, []);
  s.auth(null);
  s.auth(null);
  assert.equal(s.signIns, 1);
  assert.deepEqual(s.pages, []);
  s.auth({ uid: 'anonymous' });
  s.auth({ uid: 'anonymous' });
  assert.deepEqual(s.opened, ['EXNU22']);
  assert.deepEqual(s.pages, []);
});

test('a shared URL takes priority over the saved list', () => {
  const s = startup({ search: '?list=shared', stored: 'SAVED1' });
  s.auth({ uid: 'anonymous' });
  assert.deepEqual(s.opened, ['SHARED']);
});

test('a new visitor sees create/join controls only after authentication succeeds', () => {
  const s = startup();
  assert.deepEqual(s.pages, []);
  s.auth({ uid: 'anonymous' });
  assert.deepEqual(s.pages, ['landing']);
});

test('failed authentication keeps list access closed and offers retry', async () => {
  const s = startup({ stored: 'SAVED1' });
  s.auth(null);
  await s.deny();
  assert.deepEqual(s.opened, []);
  assert.deepEqual(s.pages, []);
  assert.equal(s.elements.startupRetry.hidden, false);
  assert.match(s.elements.startupMessage.textContent, /Couldn't connect/);
});

test('timeout and auth listener failure offer recovery without showing the landing page', () => {
  const slow = startup({ stored: 'SAVED1' });
  slow.expire();
  assert.equal(slow.elements.startupRetry.hidden, false);
  slow.auth({ uid: 'anonymous' });
  assert.deepEqual(slow.opened, ['SAVED1']);
  const failed = startup();
  failed.error();
  assert.deepEqual(failed.pages, []);
  assert.equal(failed.elements.startupRetry.hidden, false);
});
