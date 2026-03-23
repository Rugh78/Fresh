exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { text } = JSON.parse(event.body);

  const prompt = `Parse this grocery input into structured items. Input: "${text}"

Return ONLY a JSON array, no markdown, no explanation. Each object:
{"name":"item name (singular, clean)","quantity":number,"unit":"string or empty","category":"Produce|Dairy|Bakery|Meat & Seafood|Frozen|Pantry|Beverages|Snacks|Household|Personal Care|Other","emoji":"single emoji"}

Examples:
- "2 liters milk" → {"name":"Milk","quantity":2,"unit":"liters","category":"Dairy","emoji":"🥛"}
- "eggs" → {"name":"Eggs","quantity":1,"unit":"","category":"Dairy","emoji":"🥚"}
- "3 apples" → {"name":"Apples","quantity":3,"unit":"","category":"Produce","emoji":"🍎"}
- "leche" → {"name":"Leche","quantity":1,"unit":"","category":"Dairy","emoji":"🥛"}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const raw = (data.content || []).map(b => b.text || '').join('');
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
