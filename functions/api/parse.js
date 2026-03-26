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

    // FIX 1: Accept both "text" (sent by frontend) and "userInput" (legacy)
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
            content: `You are a grocery list parser. The user gives you a list of grocery items (comma-separated or natural language).
Return ONLY a valid JSON object with an 'items' array. No extra text, no markdown, no explanation.
Each item must have: name (string), quantity (number), unit (string, can be empty), category (one of: Produce, Dairy, Bakery, Meat & Seafood, Frozen, Pantry, Beverages, Snacks, Household, Personal Care, Other), emoji (single relevant emoji).
Example: {"items": [{"name": "Milk", "quantity": 2, "unit": "L", "category": "Dairy", "emoji": "🥛"}]}`
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
