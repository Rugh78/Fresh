export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { userInput } = await request.json();

    const systemPrompt = `You are a robotic grocery list parser. 
STRICT RULES:
1. Translate Spanish to English.
2. 🥑 is ALWAYS "Avocado".
3. 🥖 is ALWAYS "Baguette".
4. 🥒 is ALWAYS "Cucumber".
5. 🧈 is ALWAYS "Butter".
6. Never swap these names.
7. Output ONLY JSON in this format:
{"items": [{"name": "Item Name", "quantity": 1, "category": "Produce", "emoji": "🍎"}]}`;

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
    
    // Extract the JSON string from Groq and send it to your frontend
    const content = data.choices[0].message.content;

    return new Response(content, {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
