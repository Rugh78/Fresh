export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    if (!env.GOOGLE_API_KEY) {
      return new Response("API Key missing in Cloudflare.", { status: 500 });
    }

    const { text } = await request.json();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GOOGLE_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Parse: "${text}". Return ONLY a JSON array. 
            Format: [{"name":"item","quantity":1,"category":"Produce","emoji":"🍎"}] 
            Valid Categories: Produce, Dairy, Bakery, Meat & Seafood, Frozen, Pantry, Beverages, Snacks, Household, Personal Care, Other.`
          }]
        }]
      })
    });

    const data = await response.json();
    if (!response.ok) return new Response("Google AI Error", { status: 500 });

    const aiText = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
    return new Response(aiText, { headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}
