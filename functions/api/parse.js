export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { text } = await request.json();
    
    const systemPrompt = `You are a professional grocery list parser.
    RULES:
    1. TRANSLATE all items to English.
    2. CATEGORIZE ONLY into: [Produce, Dairy, Bakery, Meat & Seafood, Frozen, Pantry, Beverages, Snacks, Household, Personal Care, Other].
    3. Return ONLY a JSON object with this exact structure: {"items": [{"name": "string", "quantity": number, "unit": "string", "category": "string", "emoji": "string"}]}`;

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
