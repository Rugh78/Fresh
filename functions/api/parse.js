export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. Check for API Key
    if (!env.GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "Cloudflare is missing GROQ_API_KEY" }), { status: 500 });
    }

    const { text } = await request.json();

    // 2. The "System Prompt" to make the AI smart
    const systemPrompt = `You are a grocery list parser. Convert text into a JSON array. 
    Categories: [Produce, Dairy, Bakery, Meat & Seafood, Frozen, Pantry, Beverages, Snacks, Household, Personal Care, Other].
    Format: {"items": [{"name":"item","quantity":1,"unit":"","category":"Produce","emoji":"🍎"}]}`;

    // 3. Call Groq
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
          { role: "user", content: `Extract items from: "${text}"` }
        ],
        temperature: 0,
        response_format: { type: "json_object" } 
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Groq Refused Request" }), { status: 500 });
    }

    // 4. Extract the JSON string from Groq's envelope
    const aiContent = data.choices[0].message.content;

    // 5. Send it back to your index.html
    return new Response(aiContent, {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Worker Crash: " + err.message }), { status: 500 });
  }
}
