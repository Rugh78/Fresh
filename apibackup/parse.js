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
        model: "openai/gpt-oss-20b",
        messages: [
          {
            role: "system",
            content: `You are a grocery list parser that supports ANY language (Hebrew, Arabic, Spanish, English, etc).
The user gives you grocery items in any language or mix of languages.

Rules:
- ALWAYS output the item name in English, regardless of the input language. Translate Hebrew/Arabic/etc. to English.
- If an item is written ONLY as emoji(s), convert it to a clear TEXT name in English (e.g., 🍋 → "Lemon"). Keep the emoji field as the emoji. If the same emoji is repeated (e.g., 🌽🌽), set quantity equal to the count of repeated emojis and keep a single text name (e.g., "Corn").
- Choose the correct category based on what the item IS, regardless of language.
- Pick an appropriate emoji for the item.
- Infer quantity from context (e.g. "2 חלב" → quantity 2, name "חלב").

Return ONLY a valid JSON object with an 'items' array. No extra text, no markdown, no explanation.
Each item must have:
  name (string — in English),
  quantity (number, default 1),
  unit (string, can be empty),
  category (one of: Produce, Dairy, Bakery, Meat & Seafood, Frozen, Pantry, Beverages, Snacks, Household, Personal Care, Other),
  emoji (single relevant emoji)

Examples:
Input: "חלב, ביצים, לחם"
Output: {"items": [{"name": "Milk", "quantity": 1, "unit": "", "category": "Dairy", "emoji": "🥛"}, {"name": "Eggs", "quantity": 1, "unit": "", "category": "Dairy", "emoji": "🥚"}, {"name": "Bread", "quantity": 1, "unit": "", "category": "Bakery", "emoji": "🍞"}]}

Input: "2 milk, eggs, bread"
Output: {"items": [{"name": "Milk", "quantity": 2, "unit": "", "category": "Dairy", "emoji": "🥛"}, {"name": "Eggs", "quantity": 1, "unit": "", "category": "Dairy", "emoji": "🥚"}, {"name": "Bread", "quantity": 1, "unit": "", "category": "Bakery", "emoji": "🍞"}]}

Input: "🍋, 🍅, 🌽🌽, 🍉, 🍏, 🥑"
Output: {"items": [
  {"name": "Lemon", "quantity": 1, "unit": "", "category": "Produce", "emoji": "🍋"},
  {"name": "Tomato", "quantity": 1, "unit": "", "category": "Produce", "emoji": "🍅"},
  {"name": "Corn", "quantity": 2, "unit": "", "category": "Produce", "emoji": "🌽"},
  {"name": "Watermelon", "quantity": 1, "unit": "", "category": "Produce", "emoji": "🍉"},
  {"name": "Green Apple", "quantity": 1, "unit": "", "category": "Produce", "emoji": "🍏"},
  {"name": "Avocado", "quantity": 1, "unit": "", "category": "Produce", "emoji": "🥑"}
]}`
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
