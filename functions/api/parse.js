export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { text } = await request.json();
    
    const systemPrompt = `You are a professional grocery list parser. 

RULES:
1. EMOJI-FIRST PARSING: If the user provides an emoji (e.g., 🥑), the item MUST be that specific item (Avocado), even if other text is confusing.
2. TEXT TRANSLATION: If the user provides Spanish text (e.g., "pimiento rojo"), translate it to English ("Red Bell Pepper").
3. CONFLICT RESOLUTION: If an emoji and text are both provided (e.g., 🥑 + "Butter"), treat them as TWO separate items.
4. QUANTITY: Use ONLY the number and the name. Never add "each" or "x" to the name field.
   - Correct: {"name": "Eggs", "quantity": 2}
5. EMOJI GENERATION: Always provide the most accurate emoji for the English name.
6. CATEGORIES: [Produce, Dairy, Bakery, Meat & Seafood, Frozen, Pantry, Beverages, Snacks, Household, Personal Care, Other].

JSON OUTPUT ONLY: {"items": [{"name": "Item Name", "quantity": 1, "category": "Category", "emoji": "🍎"}]}`;

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
