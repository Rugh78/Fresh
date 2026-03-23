export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { text } = await request.json();

    // 1. Precise prompt for Google Gemini
    const prompt = `Parse this grocery input: "${text}". 
    Return ONLY a JSON array. Each object must have:
    {"name":"item name","quantity":number,"unit":"string or empty","category":"Produce|Dairy|Bakery|Meat & Seafood|Frozen|Pantry|Beverages|Snacks|Household|Personal Care|Other","emoji":"single emoji"}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GOOGLE_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Google API failed" }), { status: 500 });
    }

    const data = await response.json();
    
    // 2. Clean the AI response (Google often wraps JSON in code blocks)
    let rawText = data.candidates[0].content.parts[0].text;
    const cleanJson = rawText.replace(/```json|```/g, '').trim();
    
    return new Response(cleanJson, {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
