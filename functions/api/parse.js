export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // Check if the key is actually reaching the code
    if (!env.GOOGLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API Key missing! Step: Go to Deployments > Click 'Retry Deployment'." }), { status: 500 });
    }

    const { text } = await request.json();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GOOGLE_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Return ONLY a JSON array of items from: "${text}". Format: [{"name":"item","quantity":1,"unit":"","category":"Produce","emoji":"🍎"}]` }] }]
      })
    });

    // If Google rejects us, this will now tell us WHY (e.g., "Invalid Key")
    if (!response.ok) {
      const errorDetail = await response.text();
      return new Response(JSON.stringify({ error: `Google API Error: ${errorDetail}` }), { status: 500 });
    }

    const data = await response.json();
    const aiText = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
    return new Response(aiText, { headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: `Crash: ${err.message}` }), { status: 500 });
  }
}
