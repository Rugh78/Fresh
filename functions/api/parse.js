export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { text } = await request.json();
    
    const systemPrompt = `You are a simple JSON converter.
User provides: "Quantity ItemName" or "Emoji ItemName".

RULES:
1. Translate to English.
2. Use the most logical emoji for the item.
3. Output ONLY this JSON format:
{"items": [{"name": "Item Name", "quantity": 1, "category": "Produce", "emoji": "🍎"}]}

CATEGORIES: [Produce, Dairy, Bakery, Meat, Frozen, Pantry, Beverages, Snacks, Household, Other]`;

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
          { role: "user", content: `Parse: "${text}"` }
        ],
        temperature: 0,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    // Return the content directly (it will be the JSON string from the AI)
    return new Response(data.choices[0].message.content, {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    // If API itself fails, return error so the frontend fallback triggers
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
