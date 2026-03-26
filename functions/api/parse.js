export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { userInput } = await request.json();

  // Optimized System Prompt for Llama-3.1-8b
  const systemPrompt = `You are a literal grocery list converter. 
  Output ONLY valid JSON.
  - Translate Spanish to English.
  - Assign the most literal emoji (🥑=Avocado, 🥒=Cucumber).
  - Format: {"items": [{"name": "Item Name", "quantity": 1, "category": "Produce", "emoji": "🍎"}]}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.GROQ_API_KEY}` // Use your Groq Key here
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant", // The specific Groq model name
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userInput }
        ],
        temperature: 0, 
        response_format: { type: "json_object" } // This prevents "garbage" characters
      })
    });

    const data = await response.json();
    
    // Groq returns an object, we need the string content inside
    const content = data.choices[0].message.content;
    
    return new Response(content, {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
