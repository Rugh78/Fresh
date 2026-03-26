export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const { userInput } = await request.json();

    const systemPrompt = `You are a grocery data extractor.
EXAMPLES of correct mapping:
- "🍋" -> {"name": "Lemon", "emoji": "🍋", "category": "Produce"}
- "🥑" -> {"name": "Avocado", "emoji": "🥑", "category": "Produce"}
- "🌽" -> {"name": "Corn", "emoji": "🌽", "category": "Produce"}
- "🍅" -> {"name": "Tomato", "emoji": "🍅", "category": "Produce"}
- "butter" -> {"name": "Butter", "emoji": "🧈", "category": "Dairy"}

STRICT RULES:
1. NEVER use the Avocado emoji 🥑 for "Butter".
2. NEVER use the Lemon emoji 🍋 for "Tomato".
3. If an emoji is provided, the name MUST match that emoji.

JSON ONLY: {"items": []}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { "role": "system", "content": systemPrompt },
          { "role": "user", "content": userInput }
        ],
        temperature: 0,
        response_format: { "type": "json_object" }
      })
    });

    const data = await response.json();
    return new Response(data.choices[0].message.content, {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
