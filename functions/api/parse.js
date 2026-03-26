export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const { userInput } = await request.json();

    const systemPrompt = `You are a robotic grocery parser. 
    Output ONLY JSON. 
    Rules: 🥑=Avocado, 🥒=Cucumber, 🧈=Butter.
    Format: {"items": [{"name": "Item", "quantity": 1, "category": "Produce", "emoji": "🍎"}]}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userInput }
        ],
        temperature: 0,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    
    // DEBUG LOG: This picks up exactly what the AI said
    const rawContent = data.choices[0].message.content;
    console.log("RAW AI OUTPUT:", rawContent);

    // If the AI returned an empty string or null, throw an error we can see
    if (!rawContent) throw new Error("AI returned empty content");

    return new Response(rawContent, {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    // This sends the actual error message to your app's screen/console
    return new Response(JSON.stringify({ 
      error: "PARSE_ERROR", 
      details: error.message 
    }), { status: 500 });
  }
}
