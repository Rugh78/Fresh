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
    const { userInput } = await request.json();

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "Return ONLY a JSON object with an 'items' array. Example: {\"items\": [{\"name\": \"Milk\", \"quantity\": 1, \"category\": \"Dairy\", \"emoji\": \"🥛\"}]}" },
          { role: "user", content: userInput }
        ],
        temperature: 0,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    
    // --- THE CRITICAL FIX ---
    // We parse the string from Groq into a real Javascript Object
    const aiResult = JSON.parse(data.choices[0].message.content);

    // We send ONLY the object back, so the frontend sees exactly what it expects
    return new Response(JSON.stringify(aiResult), {
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" 
      }
    });

  } catch (error) {
    // If anything fails, we send a clear error to the console
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
