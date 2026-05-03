/* ═══════════════════════════════════════════════
   ai.js — Upgraded AI module
   Supports: claude, openai-compatible, mock
   ═══════════════════════════════════════════════ */

const PROVIDER = () => process.env.AI_PROVIDER || "mock";
const API_KEY  = () => process.env.AI_API_KEY;
const AI_MODEL = () => process.env.AI_MODEL || "claude-sonnet-4-6";

/* ── Main trip plan generator ── */
export async function maybeGenerateWithAI(input, liveContext) {
  if (PROVIDER() === "mock" || !API_KEY()) return null;

  const systemPrompt = `You are SmartRoute's multi-agent AI orchestrator — expert in Indian travel planning.
Return ONLY a valid JSON object. No markdown fences, no explanation text.

Required JSON structure:
{
  "summary": { "title": string, "tagline": string, "confidence": number, "totalDays": number, "travelMode": string, "notesDigest": string },
  "budget": { "cap": number, "estimated": number, "breakdown": { "accommodation": number, "food": number, "activities": number, "transit": number, "emergency": number, "misc": number } },
  "weather": [{ "date": string, "label": string, "max": number, "min": number, "emoji": string, "precipitation": number }],
  "map": { "origin": string, "destination": string },
  "itinerary": [{ "day": number, "theme": string, "summary": string, "stops": [{ "time": string, "title": string, "detail": string }] }],
  "pipeline": {
    "agents": [{ "agent": string, "status": "completed", "score": number, "output": { "recommendation": string } }],
    "planning": { "method": string, "iterations": number, "bestPathScore": number },
    "decision": { "confidenceScore": number, "decisionReasoning": [string], "factorAttribution": { "weatherSafety": number, "budgetCompliance": number, "preferenceMatch": number, "crowdAvoidance": number } },
    "stages": [{ "id": string, "name": string, "status": string, "detail": string }]
  },
  "innovations": [string],
  "trendSignals": [{ "label": string, "value": string }],
  "localKit": { "vibe": string, "phrases": [string], "packing": [string] },
  "reasoning": [string],
  "agentInsights": [{ "agent": string, "insight": string }]
}`;

  const userPrompt = `Plan a trip:
Origin: ${input.origin || "Chennai"}
Destination: ${input.destination || "Shillong"}
Days: ${input.days || 5}
Budget: Rs ${input.budget || 18000}
Persona: ${input.persona || "explorer"}
Services: ${(input.services || []).join(", ")}
Notes: ${input.notes || "None"}
Weather: ${JSON.stringify(liveContext.weather?.slice(0, 5) || [])}
Packing context: ${(liveContext.packing || []).join(", ")}

Use real local landmarks, authentic food spots for ${input.destination}. Set confidence 0.85-0.96.`;

  return callClaudeAPI(systemPrompt, userPrompt, true);
}

/* ── Chat reply generator ── */
export async function generateChatReply(message, context, history) {
  if (PROVIDER() === "mock" || !API_KEY()) {
    return buildMockChatResponse(message, context);
  }

  const systemPrompt = `You are SmartRoute's AI travel assistant. Be friendly, concise (max 3 sentences), specific to India.
Current trip: ${context.origin} to ${context.destination}, ${context.days} days, budget Rs ${context.budget}, persona: ${context.persona}.

Respond with exactly this format (no extra text):
REPLY: <your response here>
JSON: {"intent":"<intent>","quickActions":["<a1>","<a2>","<a3>"],"cards":[{"type":"<t>","title":"<t>","items":["<i1>","<i2>"]}]}`;

  try {
    const raw = await callClaudeAPIRaw(systemPrompt, message, history);
    return parseStructuredChatResponse(raw, context);
  } catch {
    return buildMockChatResponse(message, context);
  }
}

/* ── Travel risk score ── */
export async function generateRiskScore(destination, weather, days) {
  if (PROVIDER() === "mock" || !API_KEY()) {
    return buildMockRiskScore(destination, weather);
  }

  const systemPrompt = `You are a travel risk analyst. Return ONLY valid JSON:
{ "score": number(1-10), "level": "LOW"|"MODERATE"|"HIGH", "factors": [{"name":string,"impact":"positive"|"negative","detail":string}], "recommendation": string }`;

  try {
    return await callClaudeAPI(systemPrompt,
      `Assess travel risk for ${destination} (${days} days). Weather: ${JSON.stringify(weather?.slice(0, 5) || [])}. Consider infrastructure, medical access, crime, weather.`,
      true
    );
  } catch {
    return buildMockRiskScore(destination, weather);
  }
}

/* ── Packing list generator ── */
export async function generatePackingList(destination, weather, persona, days) {
  if (PROVIDER() === "mock" || !API_KEY()) {
    return buildMockPackingList(destination, weather);
  }

  const systemPrompt = `You are a travel packing expert for India. Return ONLY a JSON array of strings, max 14 items. Example: ["Item 1", "Item 2"]`;

  try {
    const result = await callClaudeAPI(systemPrompt,
      `Packing list for ${days}-day trip to ${destination}. Weather: ${JSON.stringify(weather?.slice(0, 3) || [])}. Persona: ${persona}. Be specific.`,
      true
    );
    return Array.isArray(result) ? result : buildMockPackingList(destination, weather);
  } catch {
    return buildMockPackingList(destination, weather);
  }
}

/* ── Low-level Claude API caller ── */
async function callClaudeAPI(systemPrompt, userPrompt, parseJSON = false) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         API_KEY(),
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model:      AI_MODEL(),
      max_tokens: 4096,
      system:     systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Claude API ${res.status}: ${err.slice(0, 200)}`);
  }

  const data    = await res.json();
  const content = data.content?.[0]?.text;
  if (!content) throw new Error("Claude returned empty response");
  if (!parseJSON) return content;

  // Strip any markdown fences
  const cleaned = content.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
  return JSON.parse(cleaned);
}

async function callClaudeAPIRaw(systemPrompt, userMessage, history = []) {
  const messages = [
    ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
    { role: "user", content: userMessage }
  ];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         API_KEY(),
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({ model: AI_MODEL(), max_tokens: 800, system: systemPrompt, messages })
  });

  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

/* ── Response parsers ── */
function parseStructuredChatResponse(raw, context) {
  try {
    const replyMatch = raw.match(/REPLY:\s*(.+?)(?=\nJSON:|$)/s);
    const jsonMatch  = raw.match(/JSON:\s*(\{.+?\})\s*$/s);
    const reply      = replyMatch?.[1]?.trim() || raw.split("\n")[0];
    const parsed     = jsonMatch ? JSON.parse(jsonMatch[1]) : {};
    return {
      intent:       parsed.intent || "general",
      reply:        reply || raw.trim(),
      quickActions: parsed.quickActions || buildQuickActions(context),
      cards:        parsed.cards || []
    };
  } catch {
    return { intent: "general", reply: raw.trim(), quickActions: buildQuickActions(context), cards: [] };
  }
}

function buildQuickActions(ctx) {
  return [
    `Plan a ${ctx.days || 3} day trip to ${ctx.destination || "Goa"}`,
    "Find cheaper hotels",
    "Show budget breakdown"
  ];
}

/* ── Mock fallbacks ── */
export function buildMockChatResponse(message, context) {
  const msg  = String(message || "").toLowerCase();
  const dest = context.destination || "your destination";
  const budget = context.budget || 18000;
  const days   = context.days || 3;

  if (msg.includes("hotel") || msg.includes("stay") || msg.includes("cheap")) {
    return {
      intent: "hotel_search",
      reply: `For ${dest}, budget hotels start around Rs 800-1,200/night. Mid-range with breakfast runs Rs 2,000-3,500. Book near the city centre to cut transport costs.`,
      cards: [{ type: "hotel-tips", title: "Hotel filters", items: ["Under Rs 2,500/night", "Rating 4.0+", "Free breakfast", "Within 3 km of attractions"] }],
      quickActions: [`Find hotels in ${dest}`, "Compare ratings", "Show budget breakdown"]
    };
  }

  if (msg.includes("flight") || msg.includes("book")) {
    return {
      intent: "booking",
      reply: `Flights to ${dest} typically cost Rs 2,500-6,000. Book 3-4 weeks ahead and check IndiGo + Air India for best coverage.`,
      cards: [{ type: "flight-tips", title: "Booking tips", items: ["Book Tue/Wed", "Check IndiGo + Air India", "Set Google Flights alert"] }],
      quickActions: [`Search flights to ${dest}`, "Set fare alert", "Check baggage rules"]
    };
  }

  if (msg.includes("pack") || msg.includes("carry") || msg.includes("bag")) {
    return {
      intent: "packing",
      reply: `For ${dest}: pack light layers, walking shoes, and a power bank. Check the weather — conditions can vary quickly.`,
      cards: [{ type: "packing", title: "Essentials", items: ["Travel docs", "Power bank", "Walking shoes", "Light jacket", "Water bottle", "Sunscreen"] }],
      quickActions: ["Generate full packing list", `Check weather in ${dest}`, "View itinerary"]
    };
  }

  if (msg.includes("plan") || msg.includes("itinerary") || msg.includes("trip")) {
    return {
      intent: "trip_planning",
      reply: `${days}-day plan for ${dest} within Rs ${Number(budget).toLocaleString("en-IN")}: Day 1 arrival + orientation, Day 2 core attractions, Day ${days} cultural gems + departure.`,
      cards: [
        { type: "itinerary-outline", title: "Quick plan", items: [`Day 1: Arrive + explore`, `Day 2: Main landmarks`, `Day ${days}: Local culture + depart`] },
        { type: "budget-split", title: "Budget split", items: ["35% accommodation", "22% food", "18% activities", "15% transport"] }
      ],
      quickActions: [`Generate full itinerary`, "Find hotels", "See budget breakdown"]
    };
  }

  if (msg.includes("emergency") || msg.includes("cancel") || msg.includes("delay")) {
    return {
      intent: "emergency",
      reply: `For emergencies in ${dest}: keep Rs 2,000-3,000 cash buffer, save Ola/Uber app, and note the nearest hospital. Tourist helpline: 1800-111-363.`,
      cards: [{ type: "emergency-kit", title: "Emergency numbers", items: ["Police: 100", "Ambulance: 108", "Tourist helpline: 1800-111-363", "Ola/Uber"] }],
      quickActions: ["View emergency options", "Find alternate flights", "Check nearby hospitals"]
    };
  }

  return {
    intent: "general",
    reply: `I can help plan your trip to ${dest} — itineraries, hotels, flights, packing, budget, and emergency backup. What would you like to explore?`,
    cards: [{ type: "capabilities", title: "I can help with", items: ["Trip planning", "Hotel search", "Budget analysis", "Emergency backup"] }],
    quickActions: [`Plan ${days} days in ${dest}`, "Find hotels", "Show budget breakdown"]
  };
}

function buildMockRiskScore(destination, weather) {
  const riskDays = (weather || []).filter(d => d.precipitation > 50 || d.windSpeed > 30).length;
  const score    = Math.max(4, 10 - riskDays * 1.5);
  return {
    score: Number(score.toFixed(1)),
    level: score >= 7 ? "LOW" : score >= 5 ? "MODERATE" : "HIGH",
    factors: [
      { name: "Weather", impact: riskDays > 2 ? "negative" : "positive", detail: `${riskDays} high-risk weather days` },
      { name: "Infrastructure", impact: "positive", detail: `${destination} has good tourist infrastructure` },
      { name: "Medical access", impact: "positive", detail: "Hospital within 10 km of city centre" }
    ],
    recommendation: score >= 7 ? "Safe to travel. Standard precautions apply." : "Some risk — buy travel insurance and keep backup plans."
  };
}

function buildMockPackingList(destination, weather) {
  const base = ["Travel documents (ID + copies)", "Phone charger + power bank", "Reusable water bottle", "Walking shoes", "First aid kit"];
  const dest = String(destination || "").toLowerCase();
  const hasRain = (weather || []).some(d => d.precipitation > 40);

  if (dest.includes("goa") || dest.includes("beach") || dest.includes("varkala")) {
    return [...base, "Swimwear", "Sunscreen SPF50+", "Flip flops", "Light cotton wear", hasRain ? "Waterproof bag" : "Sunglasses"];
  }
  if (dest.includes("shillong") || dest.includes("munnar") || dest.includes("ooty") || dest.includes("manali") || dest.includes("shimla")) {
    return [...base, "Warm jacket", "Rain jacket", "Waterproof shoes", "Gloves", "Thermal layers"];
  }
  if (hasRain) {
    return [...base, "Rain jacket", "Waterproof bag cover", "Quick-dry clothes", "Compact umbrella"];
  }
  return [...base, "Light jacket (evenings)", "Sunglasses", "Sunscreen", "Day backpack"];
}
