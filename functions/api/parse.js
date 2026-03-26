export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    const body = await request.json();

    // Accept both "text" (sent by frontend) and "userInput" (legacy)
    const userInput = body.text || body.userInput;

    if (!userInput || userInput.trim() === "") {
      return new Response(JSON.stringify({ error: "No input provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are a grocery list parser that supports ANY language (Hebrew, Arabic, Spanish, English, etc).
The user gives you grocery items in any language or mix of languages.

Rules:
- PRESERVE the item name EXACTLY as the user wrote it — same language, same spelling, do NOT translate.
- Choose the correct category based on what the item IS, regardless of language.
- Pick an appropriate emoji for the item.
- Infer quantity from context (e.g. "2 חלב" → quantity 2, name "חלב").

Return ONLY a valid JSON object with an 'items' array. No extra text, no markdown, no explanation.
Each item must have:
  name (string — original language, as written by user),
  quantity (number, default 1),
  unit (string, can be empty),
  category (one of: Produce, Dairy, Bakery, Meat & Seafood, Frozen, Pantry, Beverages, Snacks, Household, Personal Care, Other),
  emoji (single relevant emoji)

Examples:
Input: "חלב, ביצים, לחם"
Output: {"items": [{"name": "חלב", "quantity": 1, "unit": "", "category": "Dairy", "emoji": "🥛"}, {"name": "ביצים", "quantity": 1, "unit": "", "category": "Dairy", "emoji": "🥚"}, {"name": "לחם", "quantity": 1, "unit": "", "category": "Bakery", "emoji": "🍞"}]}

Input: "2 milk, eggs, bread"
Output: {"items": [{"name": "Milk", "quantity": 2, "unit": "", "category": "Dairy", "emoji": "🥛"}, {"name": "Eggs", "quantity": 1, "unit": "", "category": "Dairy", "emoji": "🥚"}, {"name": "Bread", "quantity": 1, "unit": "", "category": "Bakery", "emoji": "🍞"}]}`
          },
          { role: "user", content: userInput }
        ],
        temperature: 0,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const aiResult = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify(aiResult), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
