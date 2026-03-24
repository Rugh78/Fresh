export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // Check if the secret is configured
    if (!env.GOOGLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API Key is missing in Cloudflare. Go to Settings > Environment Variables, add GOOGLE_API_KEY, and then RETRY DEPLOYMENT." }), { status: 500 });
    }

    const { text } = await request.json();

    // Use Gemini 1.5 Flash (stable)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GOOGLE_API_KEY}`;

    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Return ONLY a JSON array of grocery items from this text: "${text}". 
            Format: [{"name":"item name","category":"Produce","emoji":"🍎"}]`
          }]
        }]
      })
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      return new Response(JSON.stringify({ error: "Google API rejected request", details: data }), { status: 500 });
    }

    // Clean up AI response
    let aiText = data.candidates[0].content.parts[0].text;
    const cleanJson = aiText.replace(/```json|```/g, '').trim();

    return new Response(cleanJson, {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Worker Error: " + err.message }), { status: 500 });
  }
}
