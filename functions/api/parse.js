export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { text } = await request.json();
    
    const systemPrompt = `You are a literal data converter. DO NOT be creative.

STRICT CHARACTER MAPPING:
- 🥑 = Avocado (Category: Produce)
- 🧈 = Butter (Category: Dairy)
- 🥒 = Cucumber (Category: Produce)
- 🍆 = Eggplant (Category: Produce)
- 🍋 = Lemon (Category: Produce)
- 🍇 = Grapes (Category: Produce)

OPERATING INSTRUCTIONS:
1. If an emoji is present, the item NAME must be the literal name of that emoji. 
2. IGNORE all conceptual associations (e.g., Avocado is NOT Butter).
3. If text is provided with an emoji, and they conflict, list them as separate items.
4. Name format: "Number Name" (e.g., "1 Avocado"). Remove all "each", "x", or extra words.

JSON ONLY: {"items": [{"name": "Item Name", "quantity": 1, "category": "Category", "emoji": "🥑"}]}`;


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
