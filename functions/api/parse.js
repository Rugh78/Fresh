export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { text } = await request.json();
    
    const systemPrompt = `You are a literal grocery parser. 

STRICT EMOJI IDENTIFICATION:
- 🥒 is ALWAYS Cucumber. NEVER Eggplant.
- 🍆 is ALWAYS Eggplant.
- 🍋 is ALWAYS Lemon. NEVER Grapes.
- 🍇 is ALWAYS Grapes.
- 🫑 is Bell Pepper.
- 🌶️ is Red Pepper/Chili.

MANDATORY LOGIC:
1. If the user provides an emoji, the item NAME must match that emoji exactly.
2. If the user provides text (e.g., "pimiento rojo"), translate it to English ("Red Bell Pepper").
3. Use ONLY the number and name (e.g., "3 Lemons"). No "each" or "x".
4. CATEGORIES: [Produce, Dairy, Bakery, Meat & Seafood, Frozen, Pantry, Beverages, Snacks, Household, Personal Care, Other].

JSON OUTPUT ONLY: {"items": [{"name": "Item Name", "quantity": 1, "category": "Category", "emoji": "EMOJI"}]}`;

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
