export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { text } = await request.json();
    
    const systemPrompt = `You are a professional grocery list parser.
    RULES:
    1. TRANSLATE all items to English (e.g., "Tomate" becomes "Tomato").
    2. CATEGORIZE items ONLY into: [Produce, Dairy, Bakery, Meat & Seafood, Frozen, Pantry, Beverages, Snacks, Household, Personal Care, Other].
    3. If an item is a vegetable/fruit, it MUST be "Produce". If it is wine/soda, it MUST be "Beverages".
    4. RESPOND ONLY with a JSON object: {"items": [{"name": "Tomato", "quantity": 1, "unit": "", "category": "Produce", "emoji": "🍅"}]}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Translate and parse these items: "${text}"` }
        ],
        temperature: 0,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    return new Response(data.choices[0].message.content, {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
