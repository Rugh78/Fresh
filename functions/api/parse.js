const SYSTEM_PROMPTS = {
  grocery: `You are a grocery list parser that supports ANY language (Hebrew, Arabic, Spanish, English, etc).
The user gives you grocery items in any language or mix of languages.

Rules:
- ALWAYS output the item name in English, regardless of the input language. Translate Hebrew/Arabic/etc. to English.
- If an item is written ONLY as emoji(s), convert it to a clear TEXT name in English (e.g., 🍋 → "Lemon"). Keep the emoji field as the emoji. If the same emoji is repeated (e.g., 🌽🌽), set quantity equal to the count of repeated emojis and keep a single text name (e.g., "Corn").
- Choose the correct category based on what the item IS, regardless of language.
- Dairy includes milk, cheese, butter, cream and yogurt. Yogurt, yoghurt, yogur, yogures, יוגורט and יוגורטים mean yogurt: use the English name "Yogurt" and category "Dairy". Preserve explicitly mentioned flavors and quantities. Frozen yogurt belongs in Frozen; explicitly plant-based yogurt belongs in Other.
- Pick an appropriate emoji for the item.
- Infer quantity from context (e.g. "2 חלב" → quantity 2, name "חלב").

Return ONLY a valid JSON object with an 'items' array. No extra text, no markdown, no explanation.
Each item must have:
  name (string — in English),
  quantity (number, default 1),
  unit (string, can be empty),
  category (one of: Produce, Dairy, Bakery, Meat & Seafood, Frozen, Pantry, Beverages, Snacks, Household, Personal Care, Other),
  emoji (single relevant emoji)

Examples:
Input: "חלב, ביצים, לחם"
Output: {"items": [{"name": "Milk", "quantity": 1, "unit": "", "category": "Dairy", "emoji": "🥛"}, {"name": "Eggs", "quantity": 1, "unit": "", "category": "Dairy", "emoji": "🥚"}, {"name": "Bread", "quantity": 1, "unit": "", "category": "Bakery", "emoji": "🍞"}]}

Input: "2 milk, eggs, bread"
Output: {"items": [{"name": "Milk", "quantity": 2, "unit": "", "category": "Dairy", "emoji": "🥛"}, {"name": "Eggs", "quantity": 1, "unit": "", "category": "Dairy", "emoji": "🥚"}, {"name": "Bread", "quantity": 1, "unit": "", "category": "Bakery", "emoji": "🍞"}]}

Input: "🍋, 🍅, 🌽🌽, 🍉, 🍏, 🥑"
Output: {"items": [
  {"name": "Lemon", "quantity": 1, "unit": "", "category": "Produce", "emoji": "🍋"},
  {"name": "Tomato", "quantity": 1, "unit": "", "category": "Produce", "emoji": "🍅"},
  {"name": "Corn", "quantity": 2, "unit": "", "category": "Produce", "emoji": "🌽"},
  {"name": "Watermelon", "quantity": 1, "unit": "", "category": "Produce", "emoji": "🍉"},
  {"name": "Green Apple", "quantity": 1, "unit": "", "category": "Produce", "emoji": "🍏"},
  {"name": "Avocado", "quantity": 1, "unit": "", "category": "Produce", "emoji": "🥑"}
]}`,

  travel: `You are a travel packing list parser that supports ANY language (Hebrew, Arabic, Spanish, English, etc).
The user gives you items to pack for a trip, in any language or mix of languages.

Rules:
- ALWAYS output the item name in English, regardless of the input language. Translate as needed.
- If an item is written ONLY as emoji(s), convert it to a clear TEXT name in English. If repeated (e.g., 👕👕👕), set quantity to the count.
- Choose the correct packing category based on what the item IS.
- Pick an appropriate emoji for the item.
- Infer quantity from context (e.g. "3 shirts" → quantity 3, name "Shirt").

Return ONLY a valid JSON object with an 'items' array. No extra text, no markdown, no explanation.
Each item must have:
  name (string — in English),
  quantity (number, default 1),
  unit (string, can be empty),
  category (one of: Clothing, Toiletries, Electronics, Documents, Health & Meds, Gear, Other),
  emoji (single relevant emoji)

Examples:
Input: "passport, 3 shirts, charger, sunscreen"
Output: {"items": [{"name": "Passport", "quantity": 1, "unit": "", "category": "Documents", "emoji": "🛂"}, {"name": "Shirt", "quantity": 3, "unit": "", "category": "Clothing", "emoji": "👕"}, {"name": "Charger", "quantity": 1, "unit": "", "category": "Electronics", "emoji": "🔌"}, {"name": "Sunscreen", "quantity": 1, "unit": "", "category": "Toiletries", "emoji": "🧴"}]}

Input: "מטען, מסכת שינה, 2 מכנסיים"
Output: {"items": [{"name": "Charger", "quantity": 1, "unit": "", "category": "Electronics", "emoji": "🔌"}, {"name": "Sleep Mask", "quantity": 1, "unit": "", "category": "Gear", "emoji": "😴"}, {"name": "Pants", "quantity": 2, "unit": "", "category": "Clothing", "emoji": "👖"}]}`,

  todo: `You are a to-do list parser that supports ANY language (Hebrew, Arabic, Spanish, English, etc).
The user gives you tasks in any language or mix of languages.

Today's date is {{TODAY}}. Use this to resolve any relative dates mentioned in tasks.

Rules:
- ALWAYS output the task name in English, regardless of the input language. Translate as needed. Phrase it as a short, actionable item (e.g. "Call dentist", not "Dentist").
- Determine priority from urgency cues in the text: words like "urgent", "asap", "today", "important", "!!!" → High Priority. Words like "someday", "eventually", "maybe", "low priority", "whenever" → Low Priority. Otherwise → Medium Priority.
- If a task mentions any date or deadline — "by Friday", "tomorrow", "next Monday", "June 30", "in 3 days" — resolve it to an absolute calendar date relative to today's date above, and return it as dueDate in YYYY-MM-DD format. If no date or deadline is mentioned, dueDate must be an empty string "".
- quantity is always 1, unit is always empty.
- Pick an emoji that represents the task itself (e.g. 📞 for calls, 📧 for emails, 🧹 for chores, 💰 for bills).

Return ONLY a valid JSON object with an 'items' array. No extra text, no markdown, no explanation.
Each item must have:
  name (string — in English, actionable phrasing),
  quantity (always 1),
  unit (always ""),
  category (one of: High Priority, Medium Priority, Low Priority),
  emoji (single relevant emoji),
  dueDate (string, "YYYY-MM-DD" or "" if no date was mentioned)

Example (assuming today is Tuesday, June 16, 2026):
Input: "urgent: call the bank by Friday, water plants, maybe clean garage"
Output: {"items": [{"name": "Call the bank", "quantity": 1, "unit": "", "category": "High Priority", "emoji": "📞", "dueDate": "2026-06-19"}, {"name": "Water plants", "quantity": 1, "unit": "", "category": "Medium Priority", "emoji": "🪴", "dueDate": ""}, {"name": "Clean garage", "quantity": 1, "unit": "", "category": "Low Priority", "emoji": "🧹", "dueDate": ""}]}

Input: "pay the electricity bill today, book a doctor's appointment tomorrow"
Output: {"items": [{"name": "Pay the electricity bill", "quantity": 1, "unit": "", "category": "High Priority", "emoji": "💡", "dueDate": "2026-06-16"}, {"name": "Book a doctor's appointment", "quantity": 1, "unit": "", "category": "Medium Priority", "emoji": "🩺", "dueDate": "2026-06-17"}]}`,

  custom: `You are a generic checklist parser that supports ANY language (Hebrew, Arabic, Spanish, English, etc).
The user gives you a free-form list of items to track, in any language or mix of languages.

Rules:
- ALWAYS output the item name in English, regardless of the input language. Translate as needed.
- If the same item is repeated (text or emoji), set quantity to the count, otherwise quantity is 1.
- category is always "General" — do not categorize.
- Pick a relevant emoji for the item, or 📌 if nothing fits well.

Return ONLY a valid JSON object with an 'items' array. No extra text, no markdown, no explanation.
Each item must have:
  name (string — in English),
  quantity (number, default 1),
  unit (always ""),
  category (always "General"),
  emoji (single relevant emoji)

Example:
Input: "feed the cat, books to return, books to return"
Output: {"items": [{"name": "Feed the cat", "quantity": 1, "unit": "", "category": "General", "emoji": "🐈"}, {"name": "Return books", "quantity": 2, "unit": "", "category": "General", "emoji": "📚"}]}`
};

function isValidISODate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function jsonResponse(payload, status, origin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

const ALLOWED_CATEGORIES = {
  grocery: ["Produce", "Dairy", "Bakery", "Meat & Seafood", "Frozen", "Pantry", "Beverages", "Snacks", "Household", "Personal Care", "Other"],
  travel: ["Clothing", "Toiletries", "Electronics", "Documents", "Health & Meds", "Gear", "Other"],
  todo: ["High Priority", "Medium Priority", "Low Priority"],
  custom: ["General"]
};
const MAX_BODY_BYTES = 10000;
const MAX_INPUT_LENGTH = 1000;
const MAX_ITEMS = 50;

function knownGroceryItem(value) {
  // Match only the complete product name, so frozen/flavored/non-dairy products
  // and unrelated products containing "yogurt" still go through the model.
  const name = value.normalize("NFKC").trim().toLowerCase().replace(/[.!?]+$/, "").trim();
  const match = /^(?:(\d+)\s+)?(yogurt|yogurts|yoghurt|yoghurts|yogur|yogures|יוגורט|יוגורטים)$/.exec(name);
  if (!match) return null;
  const quantity = match[1] ? Number(match[1]) : 1;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return null;
  return { name: "Yogurt", quantity, unit: "", category: "Dairy", emoji: "🥛", dueDate: "" };
}

function itemResponseFormat(listType) {
  return {
    type: "json_schema",
    json_schema: {
      name: "parsed_list_items",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["items"],
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "quantity", "unit", "category", "emoji", "dueDate"],
              properties: {
                name: { type: "string" },
                quantity: { type: "integer" },
                unit: { type: "string" },
                category: { type: "string", enum: ALLOWED_CATEGORIES[listType] },
                emoji: { type: "string" },
                dueDate: listType === "todo" ? { type: "string" } : { type: "string", enum: [""] }
              }
            }
          }
        }
      }
    }
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get("Origin");
  const requestOrigin = new URL(request.url).origin;

  if (origin && origin !== requestOrigin) {
    return jsonResponse({ error: "Origin not allowed" }, 403);
  }

  if (request.method === "OPTIONS") {
    const headers = {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };
    if (origin) headers["Access-Control-Allow-Origin"] = origin;
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }
  if (((request.headers.get("Content-Type") || "").split(";")[0]).trim().toLowerCase() !== "application/json") {
    return jsonResponse({ error: "Content-Type must be application/json" }, 415, origin);
  }

  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: "Request is too large" }, 413, origin);
  }

  let body;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: "Request is too large" }, 413, origin);
    }
    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, origin);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonResponse({ error: "Invalid request body" }, 400, origin);
  }

  const userInput = typeof body.text === "string" ? body.text :
    (typeof body.userInput === "string" ? body.userInput : "");
  const text = userInput.trim();
  if (!text) return jsonResponse({ error: "No input provided" }, 400, origin);
  if (text.length > MAX_INPUT_LENGTH) {
    return jsonResponse({ error: "Input is too long (maximum 1000 characters)" }, 413, origin);
  }

  const listType = body.type === undefined ? "grocery" : body.type;
  if (!Object.prototype.hasOwnProperty.call(SYSTEM_PROMPTS, listType)) {
    return jsonResponse({ error: "Unsupported list type" }, 400, origin);
  }

  const knownItems = [];
  let modelText = text;
  if (listType === "grocery") {
    const remaining = [];
    for (const part of text.split(/[,\n\u060c]+/).map(value => value.trim()).filter(Boolean)) {
      const known = knownGroceryItem(part);
      if (known) knownItems.push(known);
      else remaining.push(part);
    }
    if (knownItems.length > MAX_ITEMS) return jsonResponse({ error: "Too many items (maximum 50)" }, 413, origin);
    if (!remaining.length && knownItems.length) return jsonResponse({ items: knownItems }, 200, origin);
    modelText = remaining.join(", ");
  }
  if (!env.GROQ_API_KEY) {
    console.error("GROQ_API_KEY is not configured");
    return jsonResponse({ error: "Parser is temporarily unavailable" }, 503, origin);
  }

  let systemContent = SYSTEM_PROMPTS[listType];
  if (listType === "todo") {
    const today = isValidISODate(body.today) ? body.today : new Date().toISOString().slice(0, 10);
    const todayAtNoonUTC = new Date(today + "T12:00:00Z");
    const niceDate = todayAtNoonUTC.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC"
    });
    systemContent = systemContent.replace("{{TODAY}}", niceDate);
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + env.GROQ_API_KEY
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: modelText }
        ],
        temperature: 0,
        response_format: itemResponseFormat(listType)
      })
    });

    if (!response.ok) {
      console.error("Groq API returned status", response.status);
      return jsonResponse({ error: "Could not parse the items. Please try again." }, 502, origin);
    }

    const data = await response.json();
    const content = data && data.choices && data.choices[0] &&
      data.choices[0].message && data.choices[0].message.content;
    if (typeof content !== "string") throw new Error("Invalid model response");

    const parsed = JSON.parse(content);
    if (!parsed || !Array.isArray(parsed.items) ||
        parsed.items.length === 0 || parsed.items.length + knownItems.length > MAX_ITEMS) {
      throw new Error("Invalid model response");
    }

    const items = parsed.items.map(item => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new Error("Invalid model item");
      }
      const name = typeof item.name === "string" ? item.name.trim() : "";
      const quantity = item.quantity === undefined ? 1 : item.quantity;
      const unit = item.unit === undefined ? "" : item.unit;
      const category = item.category;
      const emoji = item.emoji;

      if (!name || name.length > 100 ||
          !Number.isInteger(quantity) || quantity < 1 || quantity > 999 ||
          typeof unit !== "string" || unit.length > 30 ||
          !ALLOWED_CATEGORIES[listType].includes(category) ||
          typeof emoji !== "string" || Array.from(emoji).length > 8) {
        throw new Error("Invalid model item");
      }

      const normalized = { name, quantity, unit, category, emoji: emoji || "📦" };
      if (listType === "todo") {
        const dueDate = item.dueDate === undefined ? "" : item.dueDate;
        if (typeof dueDate !== "string" || (dueDate !== "" && !isValidISODate(dueDate))) {
          throw new Error("Invalid model due date");
        }
        normalized.dueDate = dueDate;
      } else {
        normalized.dueDate = "";
      }
      return normalized;
    });

    return jsonResponse({ items: [...knownItems, ...items] }, 200, origin);
  } catch (error) {
    console.error("Parser request failed:", error && error.name ? error.name : "Error");
    return jsonResponse({ error: "Could not parse the items. Please try again." }, 502, origin);
  }
}
