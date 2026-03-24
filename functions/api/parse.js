export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    if (!env.GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY is missing in Cloudflare settings!" }), { status: 500 });
    }

    const { text } = await request.json();

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{
          role: "user",
          content: `Return ONLY a JSON array of grocery items from: "${text}". 
          Format: [{"name":"item","category":"Produce","emoji":"🍎"}]`
        }],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || "Groq Error" }), { status: 500 });
    }

    // Groq returns a structured object, we extract our array
    const result = data.choices[0].message.content;
    return new Response(result, { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Crash: " + err.message }), { status: 500 });
  }
}
