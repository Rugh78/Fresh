export async function onRequestPost(context) {
  const { request, env } = context;
  
  // Test if the key exists
  if (!env.GROQ_API_KEY) {
    return new Response(JSON.stringify({ error: "API Key Missing in Dashboard" }), { status: 500 });
  }

  try {
    const { text } = await request.json();

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Return ONLY a JSON array of items. Example: [{\"name\":\"Milk\",\"category\":\"Dairy\",\"emoji\":\"🥛\"}]" },
          { role: "user", content: text }
        ],
        temperature: 0
      })
    });

    const data = await response.json();
    const content = data.choices[0].message.content;

    return new Response(content, {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Backend Crash: " + err.message }), { status: 500 });
  }
}
