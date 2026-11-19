import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../functions/api/parse.js', import.meta.url), 'utf8');
const { onRequest } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

function request(text, type = 'grocery') {
  return new Request('https://fresh.test/api/parse', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, type, today: '2026-11-19' })
  });
}

async function withModel(reply, verify, work) {
  const previous = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
    verify(JSON.parse(options.body));
    return Response.json({ choices: [{ message: { content: JSON.stringify(reply) } }] });
  };
  try { await work(); } finally { globalThis.fetch = previous; }
}

test('plain yogurt has a reliable Dairy classification without a model in all supported languages', async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Plain yogurt should not require a model'); };
  try {
  for (const text of ['יוגורט', 'yogurt', 'yoghurt', 'yogur', 'יוגורטים', 'yogures', '2 יוגורט']) {
    const quantity = text.startsWith('2') ? 2 : 1;
    const expected = { name: 'Yogurt', quantity, unit: '', category: 'Dairy', emoji: '🥛', dueDate: '' };
    const response = await onRequest({ request: request(text), env: {} });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { items: [expected] });
  }
  } finally { globalThis.fetch = previous; }
});

test('mixed lists keep known yogurt and constrain the remaining model categories', async () => {
  const milk = { name: 'Milk', quantity: 1, unit: '', category: 'Dairy', emoji: '🥛', dueDate: '' };
  await withModel({ items: [milk] }, body => {
      assert.equal(body.messages[1].content, 'חלב');
      assert.match(body.messages[0].content, /יוגורט/);
      assert.equal(body.response_format.type, 'json_schema');
      assert.equal(body.response_format.json_schema.strict, true);
      const schema = body.response_format.json_schema.schema;
      const item = schema.properties.items.items;
      assert.equal(item.additionalProperties, false);
      assert.deepEqual([...item.required].sort(), Object.keys(item.properties).sort());
      assert.ok(item.properties.category.enum.includes('Dairy'));
      assert.ok(!item.properties.category.enum.includes('Dairy Products'));
    }, async () => {
      const response = await onRequest({ request: request('2 יוגורט, חלב'), env: { GROQ_API_KEY: 'test' } });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.items[0].name, 'Yogurt');
      assert.equal(data.items[0].quantity, 2);
      assert.equal(data.items[0].category, 'Dairy');
      assert.deepEqual(data.items[1], milk);
    });
});

test('yogurt variants and unrelated product names are left to the model', async () => {
  for (const text of ['frozen yogurt', 'soy yogurt', 'strawberry yogurt', 'yogurt shampoo']) {
    let called = false;
    const item = { name: text, quantity: 1, unit: '', category: 'Other', emoji: '📦', dueDate: '' };
    await withModel({ items: [item] }, body => {
      called = true;
      assert.equal(body.messages[1].content, text);
    }, async () => {
      const response = await onRequest({ request: request(text), env: { GROQ_API_KEY: 'test' } });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).items[0].category, 'Other');
    });
    assert.equal(called, true);
  }
});

test('each list type receives its own allowed categories and due-date schema', async () => {
  for (const [type, category] of [['travel', 'Clothing'], ['todo', 'High Priority'], ['custom', 'General']]) {
    const dueDate = type === 'todo' ? '2026-11-20' : '';
    const item = { name: 'Example', quantity: 1, unit: '', category, emoji: '📦', dueDate };
    await withModel({ items: [item] }, body => {
      const properties = body.response_format.json_schema.schema.properties.items.items.properties;
      assert.ok(properties.category.enum.includes(category));
      assert.ok(!properties.category.enum.includes('Dairy'));
      if (type === 'todo') assert.equal(properties.dueDate.enum, undefined);
      else assert.deepEqual(properties.dueDate.enum, ['']);
    }, async () => {
      const response = await onRequest({ request: request('Example', type), env: { GROQ_API_KEY: 'test' } });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).items[0].dueDate, dueDate);
    });
  }
});

test('server validation still rejects invalid items despite schema constraints', async () => {
  const item = { name: 'Yogurt', quantity: 1, unit: '', category: 'Dairy', emoji: '🥛', dueDate: '' };
  for (const invalid of [{ ...item, category: 'Invented' }, { ...item, quantity: -1 }, { ...item, name: '' }]) {
    await withModel({ items: [invalid] }, () => {}, async () => {
      const response = await onRequest({ request: request('milk'), env: { GROQ_API_KEY: 'test' } });
      assert.equal(response.status, 502);
    });
  }
});
