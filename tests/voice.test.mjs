import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const voice = readFileSync(new URL('../voice.js', import.meta.url), 'utf8');
const addItems = html.slice(html.indexOf('async function addItems() {'), html.indexOf('// --- 9. RENDERING ---'));

function setup() {
  const elements = {};
  let recorder;
  let stopped = 0;
  let pending;
  let key = 0;
  const writes = [];
  class Recorder {
    static isTypeSupported(type) { return type.startsWith('audio/webm'); }
    constructor() { recorder = this; this.mimeType = 'audio/webm'; this.state = 'inactive'; }
    start() { this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      this.ondataavailable({ data: new Blob(['audio'], { type: this.mimeType }) });
      pending = this.onstop();
    }
  }
  const context = vm.createContext({
    Blob, FormData, AbortController, setTimeout, clearTimeout,
    window: { isSecureContext: true, MediaRecorder: Recorder, addEventListener() {} },
    MediaRecorder: Recorder,
    navigator: { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop() { stopped++; } }] }) } },
    document: { getElementById(id) {
      return elements[id] ||= { value: '', disabled: false, style: {}, classList: { toggle() {} }, setAttribute() {}, focus() {} };
    } },
    listId: 'HOUSE', currentBoardId: 'grocery',
    curBoard: () => ({ type: 'grocery' }),
    curCfg: () => ({ addBtnLabel: '+ Add Items', cats: ['Other'] }), fallbackCategory: () => 'Other',
    getLocalISODate: () => '2026-11-19',
    fetch: async url => ({ ok: true, json: async () => url === '/api/transcribe'
      ? { text: 'חלב, bread, huevos' }
      : { items: ['Milk', 'Bread', 'Eggs'].map(name => ({ name, quantity: 1, unit: '', category: 'Other', emoji: '📦' })) } }),
    db: { ref: path => ({ push: () => ({ key: String(++key) }), update: async data => { writes.push({ path, data }); } }) }
  });
  vm.runInContext(voice + '\n' + addItems, context);
  return { context, elements, writes, get recorder() { return recorder; }, get stopped() { return stopped; }, wait: () => pending };
}

test('recording transcribes multiple multilingual items and saves them once', async () => {
  const s = setup();
  s.context.document.getElementById('itemInput').value = 'apples';
  await s.context.toggleVoice();
  assert.equal(s.recorder.state, 'recording');
  assert.equal(s.elements.addBtn.disabled, true);
  await s.context.toggleVoice();
  await s.wait();
  assert.equal(s.stopped, 1);
  assert.equal(s.writes.length, 1);
  assert.equal(s.writes[0].path, 'lists/HOUSE/boards/grocery/items');
  assert.equal(Object.keys(s.writes[0].data).length, 3);
  assert.equal(s.elements.itemInput.value, '');
  assert.equal(s.elements.voiceBtn.disabled, false);
});

test('permission denial restores controls and preserves typed text', async () => {
  const s = setup();
  s.context.document.getElementById('itemInput').value = 'bread';
  s.context.navigator.mediaDevices.getUserMedia = async () => { throw { name: 'NotAllowedError' }; };
  await s.context.toggleVoice();
  assert.match(s.elements.errorMsg.textContent, /denied/);
  assert.equal(s.elements.itemInput.value, 'bread');
  assert.equal(s.elements.addBtn.disabled, false);
});

test('cancelling a recording releases the microphone without saving', async () => {
  const s = setup();
  await s.context.toggleVoice();
  s.context.cancelVoice();
  await s.wait();
  assert.equal(s.stopped >= 1, true);
  assert.equal(s.writes.length, 0);
});

test('switching lists during transcription discards late results', async () => {
  const s = setup();
  let resolve;
  s.context.fetch = () => new Promise(r => { resolve = r; });
  await s.context.toggleVoice();
  await s.context.toggleVoice();
  s.context.cancelVoice();
  s.context.currentBoardId = 'travel';
  resolve({ ok: true, json: async () => ({ text: 'Milk' }) });
  await s.wait();
  assert.equal(s.writes.length, 0);
  assert.equal(s.elements.itemInput.value, '');
});

test('failed transcription displays an error and never adds items', async () => {
  const s = setup();
  s.context.fetch = async () => ({ ok: false, json: async () => ({ error: 'No speech detected.' }) });
  await s.context.toggleVoice();
  await s.context.toggleVoice();
  await s.wait();
  assert.equal(s.writes.length, 0);
  assert.match(s.elements.errorMsg.textContent, /No speech/);
  assert.equal(s.elements.addBtn.disabled, false);
});

test('a save failure retains the transcript and does not retry with duplicates', async () => {
  const s = setup();
  s.context.document.getElementById('itemInput').value = 'Milk, Bread';
  let attempts = 0;
  s.context.db.ref = () => ({ push: () => ({ key: 'item' }), update: async () => { attempts++; throw new Error('Denied'); } });
  await s.context.addItems();
  assert.equal(attempts, 1);
  assert.equal(s.elements.itemInput.value, 'Milk, Bread');
  assert.match(s.elements.errorMsg.textContent, /Could not save/);
});

test('adding while switching boards saves only to the original board', async () => {
  const s = setup();
  s.context.document.getElementById('itemInput').value = 'Milk';
  let resolve;
  s.context.fetch = () => new Promise(r => { resolve = r; });
  const adding = s.context.addItems();
  s.context.currentBoardId = 'travel';
  resolve({ ok: true, json: async () => ({ items: [{ name: 'Milk', quantity: 1, unit: '', category: 'Other', emoji: '📦' }] }) });
  await adding;
  assert.equal(s.writes[0].path, 'lists/HOUSE/boards/grocery/items');
});

test('quick clear respects confirmation and only removes the current list items', () => {
  const s = setup();
  const removals = [];
  s.context.db.ref = path => ({ remove: () => removals.push(path) });
  s.context.document.getElementById('addBtn');
  vm.runInContext(html.slice(html.indexOf('function clearList() {'), html.indexOf('async function deleteBoard() {')), s.context);
  s.context.confirm = () => false;
  s.context.clearList();
  assert.equal(removals.length, 0);
  s.context.confirm = () => true;
  s.context.clearList();
  assert.deepEqual(removals, ['lists/HOUSE/boards/grocery/items']);
});

test('unsupported browsers show a useful error without attempting recording', async () => {
  const s = setup();
  s.context.window.MediaRecorder = undefined;
  await s.context.toggleVoice();
  assert.match(s.elements.errorMsg.textContent, /unavailable in this browser/);
  assert.equal(s.writes.length, 0);
});

const endpointSource = readFileSync(new URL('../functions/api/transcribe.js', import.meta.url), 'utf8');
const { onRequest } = await import('data:text/javascript;base64,' + Buffer.from(endpointSource).toString('base64'));
const env = { GROQ_API_KEY: 'test-key' };
function audioRequest(type = 'audio/webm', content = 'audio') {
  const form = new FormData();
  form.append('file', new Blob([content], { type }), 'recording.webm');
  return new Request('https://example.test/api/transcribe', { method: 'POST', body: form });
}

test('transcription endpoint validates method, configuration, file and size', async () => {
  assert.equal((await onRequest({ request: new Request('https://example.test'), env })).status, 405);
  assert.equal((await onRequest({ request: audioRequest(), env: {} })).status, 503);
  assert.equal((await onRequest({ request: audioRequest('text/plain'), env })).status, 415);
  assert.equal((await onRequest({ request: audioRequest('audio/webm', ''), env })).status, 400);
  assert.equal((await onRequest({ request: audioRequest('audio/webm', new Uint8Array(10 * 1024 * 1024 + 1)), env })).status, 413);
});

test('transcription uses automatic language detection and hides upstream errors', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://api.groq.com/openai/v1/audio/transcriptions');
      assert.equal(options.body.get('language'), null);
      assert.equal(options.body.get('model'), 'whisper-large-v3');
      return Response.json({ text: 'חלב, bread, huevos' });
    };
    const response = await onRequest({ request: audioRequest(), env });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).text, 'חלב, bread, huevos');
    globalThis.fetch = async () => new Response('secret upstream error', { status: 401 });
    const failed = await onRequest({ request: audioRequest(), env });
    assert.equal(failed.status, 502);
    assert.doesNotMatch(await failed.text(), /secret/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
