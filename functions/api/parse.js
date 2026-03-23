export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { text } = await request.json();

    // The prompt ensures the AI returns ONLY the JSON array we need
    const prompt = `Parse this grocery input into a structured JSON array. 
    Input: "${text}"
    
    Return ONLY a JSON array. Each object must have:
    {"name":"item name","quantity":number,"unit":"string or empty","category":"Produce|Dairy|Bakery|Meat & Seafood|Frozen|Pantry|Beverages|Snacks|Household|Personal Care|Other","emoji":"single emoji"}
    
    Strictly follow the category list provided.`;

    // Google Gemini API Endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GOOGLE_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return new Response(JSON.stringify({ error: "Google API Error", details: errorData }), { status: 500 });
    }

    const data = await response.json();
    
    // Extract the text from Gemini's response structure
    let rawText = data.candidates[0].content.parts[0].text;
    
    // Clean up any markdown code blocks the AI might include
    const cleanJson = rawText.replace(/```json|```/g, '').trim();
    
    return new Response(cleanJson, {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
