// Inside your Cloudflare Worker's fetch handler
const systemPrompt = `
You are a grocery list parser. Your ONLY job is to convert unstructured text into a JSON array.
RULES:
1. Extract the Item Name, Quantity (number), and Unit (if any).
2. Assign exactly ONE category from this list: [Produce, Dairy, Bakery, Meat & Seafood, Frozen, Pantry, Beverages, Snacks, Household, Personal Care, Other].
3. Choose a relevant emoji for the item.
4. If no quantity is mentioned, default to 1.
5. RESPOND ONLY WITH A VALID JSON ARRAY. No chat, no explanations.

EXAMPLE INPUT: "2 cartons of milk, 3 bananas, toilet paper"
EXAMPLE OUTPUT:
[
  {"name": "Milk", "quantity": 2, "unit": "cartons", "category": "Dairy", "emoji": "🥛"},
  {"name": "Bananas", "quantity": 3, "unit": "", "category": "Produce", "emoji": "🍌"},
  {"name": "Toilet Paper", "quantity": 1, "unit": "", "category": "Household", "emoji": "🧻"}
]
`;

// When calling Groq/AI:
const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${env.GROQ_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "llama-3.3-70b-versatile", // Or your preferred model
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userTextInput }
    ],
    temperature: 0, // Keep it at 0 for maximum consistency
    response_format: { type: "json_object" } // This forces JSON mode
  })
});
