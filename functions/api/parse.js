export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. Check if the API Key is actually reaching the code
    if (!env.GOOGLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API Key is missing from Cloudflare! Go to Settings > Environment Variables, add GOOGLE_API_KEY, then you MUST go to the Deployments tab and click 'Retry Deployment'." }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { text } = await request.json();

    // 2. The stable 1.5 Flash endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GOOGLE_API_KEY}`;

    const prompt = `Parse this grocery input: "${text}". 
    Return ONLY a JSON array. Each object must have:
    {"name":"item name","quantity":number,"unit":"string or empty","category":"Produce|Dairy|Bakery|Meat & Seafood|Frozen|Pantry|Beverages|Snacks|Household|Personal Care|Other","emoji":"single emoji"}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    // 3. The Debug Shield: If Google rejects us, this will show the REAL reason in your app
    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `Google API Error: ${errorText}` }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // 4. Clean and return the AI text
    let rawText = data.candidates[0].content.parts[0].text;
    const cleanJson = rawText.replace(/```json|```/g, '').trim();
    
    return new Response(cleanJson, {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Function Crash: ${err.message}` }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
