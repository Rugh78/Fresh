export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
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
          { 
            "role": "system", 
            "content": "You are a grocery parser. Convert input to a JSON object with an 'items' array. Each item needs: name, quantity, category, and emoji. Output JSON only." 
          },
          { "role": "user", "content": userInput }
        ],
        temperature: 0,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();

    // INTERCEPT HTTP ERRORS (e.g., 401 Invalid API Key, 400 Bad Request)
    if (!response.ok) {
      const groqErrorMessage = data.error?.message || response.statusText;
      throw new Error(`Groq API rejected the request: ${groqErrorMessage}`);
    }

    if (!data.choices || !data.choices[0]) {
      throw new Error("Groq API succeeded but returned an invalid structure.");
    }

    return new Response(data.choices[0].message.content, {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    // Expose the exact error back to the client
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
