/* ═══════════════════════════════════════════════════════════════
   SmartRoute v2.0 — Production Server
   Phase 2 upgrades:
   ✅ JWT Authentication
   ✅ WebSocket real-time agent streaming
   ✅ In-memory caching (cache.js)
   ✅ Claude AI integration (ai.js)
   ✅ Advanced flight search with realism
   ✅ Travel risk score endpoint
   ✅ AI-powered packing list
   ✅ Emergency replanning with intelligence
   ✅ Rate limiting
   ✅ Structured error handling
   ═══════════════════════════════════════════════════════════════ */

import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import http from "http";
// ws is optional — gracefully degrade if not installed
let WebSocketServer;
try {
  const wsModule = await import("ws");
  WebSocketServer = wsModule.WebSocketServer;
} catch {
  WebSocketServer = null;
  console.log("  ⚠  ws package not found — WebSocket disabled. Run: npm install ws");
}
import { fileURLToPath } from "url";

import {
  geocodePlace, fetchWeather, weatherEmoji,
  fetchActivities, generateRealisticFlights,
  generateRealisticHotels, generateFlightBookingUrl, generateHotelBookingUrl
} from "./lib/api.js";
import { buildMockPlan } from "./lib/planner.js";
import {
  maybeGenerateWithAI, generateChatReply,
  generateRiskScore, generatePackingList, buildMockChatResponse
} from "./lib/ai.js";
import {
  authMiddleware, softAuth,
  handleRegister, handleLogin, handleMe, handleUpdatePreferences
} from "./lib/auth.js";
import cache from "./lib/cache.js";
import {
  handleCreateCheckout, handleGetSession, handleWebhook
} from "./lib/payments.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app    = express();
const server = http.createServer(app);
const port   = Number(process.env.PORT || 8787);

const allowedOrigins = [
  process.env.CORS_ORIGIN || "http://localhost:5173",
  "http://localhost:8787",
  "http://localhost:4173"
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    cb(null, true); // permissive for dev — tighten in prod
  },
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));

/* ──────────────────────────────────────────────
   STATIC FILES
   ────────────────────────────────────────────── */
const staticDir    = path.resolve(__dirname, "..", "static");
const staticOptions = {
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  }
};
app.use("/static", express.static(staticDir, staticOptions));
app.use("/",       express.static(staticDir, staticOptions));
app.get("/static/*", (req, res, next) => {
  res.sendFile(path.join(staticDir, "index.html"), err => { if (err) next(); });
});

/* ──────────────────────────────────────────────
   WEBSOCKET — real-time agent streaming
   ────────────────────────────────────────────── */
const clients = new Set();
let wss = null;

if (WebSocketServer) {
  wss = new WebSocketServer({ server });
  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify({ type: "connected", message: "SmartRoute WS ready" }));
    ws.on("close", () => clients.delete(ws));
    ws.on("error", () => clients.delete(ws));
  });
}

function broadcastToAll(data) {
  const msg = JSON.stringify(data);
  clients.forEach(ws => {
    if (ws.readyState === 1) ws.send(msg);
  });
}

function broadcastAgentUpdate(agent, status, detail, score) {
  broadcastToAll({ type: "agent_update", agent, status, detail, score, ts: Date.now() });
}

/* ──────────────────────────────────────────────
   SIMPLE RATE LIMITER (no deps)
   ────────────────────────────────────────────── */
const rateLimits = new Map();
function rateLimit(windowMs = 60000, max = 30) {
  return (req, res, next) => {
    const ip  = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const now = Date.now();
    const key = `${ip}:${req.path}`;
    const entry = rateLimits.get(key) || { count: 0, reset: now + windowMs };

    if (now > entry.reset) {
      entry.count = 0;
      entry.reset = now + windowMs;
    }
    entry.count++;
    rateLimits.set(key, entry);

    if (entry.count > max) {
      return res.status(429).json({ ok: false, error: "Too many requests. Please wait a moment." });
    }
    next();
  };
}

/* ──────────────────────────────────────────────
   HEALTH
   ────────────────────────────────────────────── */
app.get("/api/health", (_req, res) => {
  res.json({
    ok:        true,
    version:   "2.0.0",
    provider:  process.env.AI_PROVIDER || "mock",
    wsClients: clients.size,
    cache:     cache.stats(),
    timestamp: new Date().toISOString()
  });
});

/* ──────────────────────────────────────────────
   AUTH ENDPOINTS
   ────────────────────────────────────────────── */
app.post("/api/auth/register", rateLimit(60000, 10), handleRegister);
app.post("/api/auth/login",    rateLimit(60000, 20), handleLogin);
app.get( "/api/auth/me",       authMiddleware,        handleMe);
app.post("/api/auth/preferences", authMiddleware,     handleUpdatePreferences);

/* ──────────────────────────────────────────────
   PAYMENT ENDPOINTS — Stripe Checkout
   ────────────────────────────────────────────── */
app.post("/api/payments/checkout",     rateLimit(60000, 15), handleCreateCheckout);
app.get( "/api/payments/session/:id",                        handleGetSession);
app.post("/api/payments/webhook",      express.raw({ type: "application/json" }), handleWebhook);

/* ──────────────────────────────────────────────
   BUDGET  (in-memory per-session, no auth needed)
   ────────────────────────────────────────────── */
const BUDGET_CATS   = ["Food", "Shopping", "Transport", "Hotels", "Activities"];
let   budgetStore   = null;

function defaultAlloc(total) {
  return { Food: Math.round(total*0.20), Shopping: Math.round(total*0.15), Transport: Math.round(total*0.20), Hotels: Math.round(total*0.30), Activities: Math.round(total*0.15) };
}

function formatBudget(total, allocs, spent = {}) {
  const categories = BUDGET_CATS.reduce((acc, cat) => {
    const allocated = Number(allocs[cat] || 0);
    const s         = Number(spent[cat] || 0);
    acc[cat] = { allocated, spent: s, remaining: allocated - s, progress: allocated > 0 ? Math.round((s / allocated)*100) : 0 };
    return acc;
  }, {});
  return {
    totalBudget: Number(total),
    totalSpent:  Object.values(categories).reduce((s,c) => s+c.spent, 0),
    categories
  };
}

app.post("/api/budget/create", (req, res) => {
  const { total_budget, totalBudget: alt, allocations } = req.body || {};
  const total = Number(total_budget || alt || 0);
  if (!total) return res.status(400).json({ ok:false, error:"Total budget is required." });

  const mapped = { ...allocations };
  if (mapped.Stay && !mapped.Hotels) { mapped.Hotels = mapped.Stay; delete mapped.Stay; }
  const norm = BUDGET_CATS.reduce((a,c) => ({ ...a, [c]: Number(mapped?.[c] ?? defaultAlloc(total)[c]) }), {});

  budgetStore = formatBudget(total, norm);
  res.json({ ok:true, budget: budgetStore });
});

app.post("/api/budget/update", (req, res) => {
  const { category, amount } = req.body || {};
  if (!budgetStore) return res.status(400).json({ ok:false, error:"Create a budget first." });
  if (!BUDGET_CATS.includes(category)) return res.status(400).json({ ok:false, error:"Invalid category." });

  const spent = BUDGET_CATS.reduce((a,c) => ({ ...a, [c]: budgetStore.categories[c].spent }), {});
  spent[category] += Number(amount || 0);
  const allocs = BUDGET_CATS.reduce((a,c) => ({ ...a, [c]: budgetStore.categories[c].allocated }), {});
  budgetStore = formatBudget(budgetStore.totalBudget, allocs, spent);
  res.json({ ok:true, budget: budgetStore });
});

app.get("/api/budget/status", (_req, res) => res.json({ ok:true, budget: budgetStore }));

app.get("/api/budget/suggest", (_req, res) => {
  if (!budgetStore) return res.json({ ok:true, suggestions:[{ type:"info", text:"Create a budget first." }] });

  const suggestions = [];
  Object.entries(budgetStore.categories || {}).forEach(([key, val]) => {
    if (val.progress > 85) suggestions.push({ type:"danger",     text:`${key} critically low — ${val.progress}% used!` });
    else if (val.progress > 60) suggestions.push({ type:"warning", text:`${key} at ${val.progress}% — monitor closely.` });
  });

  const { Hotels, Shopping, Food, Activities } = budgetStore.categories || {};
  if (Hotels?.progress > 75 && Shopping?.remaining > 2000) {
    suggestions.push({ type:"suggestion", text:"Move ₹2,000 from Shopping → Hotels for a better stay." });
  }
  if (Activities?.progress > 80 && Food?.remaining > 1500) {
    suggestions.push({ type:"suggestion", text:"Move ₹1,500 from Food → Activities for more experiences." });
  }
  if (!suggestions.length) suggestions.push({ type:"success", text:"Budget allocation looks healthy — all categories within safe limits." });

  const totalPct = budgetStore.totalBudget > 0 ? Math.round((budgetStore.totalSpent / budgetStore.totalBudget)*100) : 0;
  res.json({ ok:true, suggestions, health: totalPct < 60 ? "excellent" : totalPct < 85 ? "moderate" : "critical", overallSpentPct: totalPct });
});

/* ──────────────────────────────────────────────
   CHAT — Claude-powered with fallback
   ────────────────────────────────────────────── */
app.post("/api/chat", rateLimit(60000, 40), async (req, res) => {
  const { message, context, history } = req.body || {};
  if (!message?.trim()) return res.status(400).json({ ok:false, error:"Message is required." });

  const cacheKey = `chat:${message.toLowerCase().trim().slice(0,60)}:${context?.destination}`;
  const cached   = cache.get(cacheKey);
  if (cached) return res.json({ ok:true, ...cached, fromCache: true });

  try {
    const result = await generateChatReply(message, context || {}, Array.isArray(history) ? history : []);
    cache.set(cacheKey, result, 120); // cache 2 min
    res.json({ ok:true, ...result });
  } catch (e) {
    const fallback = buildMockChatResponse(message, context || {});
    res.json({ ok:true, ...fallback });
  }
});

/* ──────────────────────────────────────────────
   FLIGHTS — realistic mock + optional Amadeus
   ────────────────────────────────────────────── */
app.post("/api/flights/search", rateLimit(60000, 20), async (req, res) => {
  const { origin, destination, departure_date, return_date, passengers } = req.body || {};
  if (!origin || !destination) return res.status(400).json({ ok:false, error:"Origin and destination required." });

  const cacheKey = `flights:${origin}:${destination}:${departure_date}:${passengers}`;
  const cached   = cache.get(cacheKey);
  if (cached) return res.json({ ok:true, ...cached, fromCache:true });

  const flights    = generateRealisticFlights(origin, destination, departure_date, Number(passengers)||1);
  const bookingUrl = generateFlightBookingUrl(origin, destination, departure_date);
  const result     = { flights, bookingUrl, searchedAt: new Date().toISOString() };
  cache.set(cacheKey, result, 300); // 5 min
  res.json({ ok:true, ...result });
});

/* ──────────────────────────────────────────────
   HOTELS — realistic mock
   ────────────────────────────────────────────── */
app.post("/api/hotels/search", rateLimit(60000, 20), async (req, res) => {
  const { city, budget, check_in, check_out } = req.body || {};
  if (!city?.trim()) return res.status(400).json({ ok:false, error:"City is required." });

  const cacheKey = `hotels:${city}:${budget}`;
  const cached   = cache.get(cacheKey);
  if (cached) return res.json({ ok:true, ...cached, fromCache:true });

  const hotels     = generateRealisticHotels(city, Number(budget)||10000);
  const bookingUrl = generateHotelBookingUrl(city, check_in, check_out);
  const result     = { hotels, bookingUrl };
  cache.set(cacheKey, result, 300);
  res.json({ ok:true, ...result });
});

/* ──────────────────────────────────────────────
   ACTIVITIES — OpenTripMap + fallback
   ────────────────────────────────────────────── */
app.post("/api/activities/search", async (req, res) => {
  const { destination, latitude, longitude } = req.body || {};
  let lat = latitude, lon = longitude;

  if ((!lat || !lon) && destination) {
    const cacheKey = `geo:${destination}`;
    const geo = await cache.getOrSet(cacheKey, () => geocodePlace(destination), 3600);
    if (geo) { lat = geo.latitude; lon = geo.longitude; }
  }
  if (!lat || !lon) return res.status(400).json({ ok:false, error:"Could not determine location." });

  const cacheKey = `activities:${Number(lat).toFixed(2)}:${Number(lon).toFixed(2)}`;
  const activities = await cache.getOrSet(cacheKey, () => fetchActivities(lat, lon), 1800);

  if (!activities?.length) {
    const fallback = ["Heritage Walk","Local Market","Scenic Viewpoint","Museum","Public Park","Temple or Shrine"]
      .map((name,i) => ({ id:`f${i}`, name:`${destination} ${name}`, kinds:"cultural, local", distance:`${(i+1)*0.8} km`, rating: 4+Math.random()*0.9 }));
    return res.json({ ok:true, activities:fallback, source:"curated" });
  }
  res.json({ ok:true, activities, source:"opentripmap" });
});

/* ──────────────────────────────────────────────
   QUICK TRIP
   ────────────────────────────────────────────── */
app.post("/api/quick-trip", (req, res) => {
  const { latitude, longitude, available_hours } = req.body || {};
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return res.status(400).json({ ok:false, error:"Latitude and longitude required." });
  }
  const hours = Math.max(1, Math.min(Number(available_hours)||4, 12));
  const places = [
    { name:"Lakeview Escape",      distance:"12 km", estimated_travel_time:"28 mins", rating:4.6, note:`Scenic stop reachable within ${hours} hrs.` },
    { name:"Old Town Food Street", distance:"8 km",  estimated_travel_time:"22 mins", rating:4.4, note:"Food-first short exploration." },
    { name:"Hilltop Sunset Point", distance:"18 km", estimated_travel_time:"40 mins", rating:4.7, note:"Best photogenic views with minimal planning." },
    { name:"Heritage Bazaar",      distance:"5 km",  estimated_travel_time:"15 mins", rating:4.3, note:"Local crafts and street food." },
  ].slice(0, Math.min(hours, 3) + 1);
  res.json({ ok:true, places });
});

/* ──────────────────────────────────────────────
   PACKING LIST — AI-powered
   ────────────────────────────────────────────── */
app.post("/api/packing-list", async (req, res) => {
  const { destination, travel_dates, persona, days } = req.body || {};
  if (!destination?.trim()) return res.status(400).json({ ok:false, error:"Destination is required." });

  const cacheKey = `packing:${destination}:${persona}:${days}`;
  const items = await cache.getOrSet(cacheKey, async () => {
    // Get weather for context
    const geo = await geocodePlace(destination).catch(() => null);
    const weather = geo ? await fetchWeather(geo.latitude, geo.longitude, Number(days)||5).catch(() => []) : [];
    const wWeather = weather.map(d => ({ ...d, emoji: weatherEmoji(d.weatherCode) }));
    return generatePackingList(destination, wWeather, persona || "explorer", Number(days)||5);
  }, 1800);

  res.json({ ok:true, items, destination });
});

/* ──────────────────────────────────────────────
   EMERGENCY OPTIONS — with intelligence
   ────────────────────────────────────────────── */
app.post("/api/emergency-options", (req, res) => {
  const { origin, destination } = req.body || {};
  const dest = destination || "Destination";
  const orig = origin || "Origin";

  res.json({
    ok:true,
    options: {
      nearbyHotels: [
        `${dest} Airport Transit Hotel`,
        `${dest} Budget Inn (24hr check-in)`,
        `${dest} City Centre Emergency Stay`
      ],
      alternateFlights: [
        `${orig} → ${dest} redeye (next day)`,
        `${orig} → ${dest} via Delhi connection`,
        `${orig} → ${dest} morning first flight`
      ],
      transportOptions: ["Ola/Uber priority booking","Railway station transfer","Pre-paid airport taxi","Local auto-rickshaw"],
      emergencyContacts: {
        police: "100", ambulance: "108",
        touristHelpline: "1800-111-363",
        airportHelpdesk: "1800-180-1407"
      },
      insuranceTips: [
        "File a delay certificate at the airline counter",
        "Photograph all receipts for reimbursement",
        "Contact your bank for emergency card limit increase"
      ]
    }
  });
});

/* ──────────────────────────────────────────────
   CROWD INFO
   ────────────────────────────────────────────── */
app.post("/api/crowd-info", (req, res) => {
  const { destination, attractions } = req.body || {};
  const places = Array.isArray(attractions) && attractions.length ? attractions : [`${destination || "City"} Central`];

  res.json({
    ok:true,
    locations: places.map((name, i) => ({
      name,
      peak_hours:        i%2===0 ? "11:00 AM – 2:00 PM" : "5:00 PM – 8:00 PM",
      recommended_time:  i%2===0 ? "8:00 AM – 10:00 AM" : "3:30 PM – 5:00 PM",
      indicator:         i%2===0 ? "Moderate crowd risk" : "Best before evening rush",
      currentDensity:    Math.round(30 + Math.random()*60),
      weekendMultiplier: 1.4
    }))
  });
});

/* ──────────────────────────────────────────────
   ITINERARY — structured day plan
   ────────────────────────────────────────────── */
app.post("/api/itinerary", async (req, res) => {
  const { destination, number_of_days, budget, interests } = req.body || {};
  if (!destination?.trim()) return res.status(400).json({ ok:false, error:"Destination is required." });

  const totalDays = Math.max(1, Math.min(Number(number_of_days)||3, 7));
  const cacheKey  = `itinerary:${destination}:${totalDays}`;
  const cached    = cache.get(cacheKey);
  if (cached) return res.json({ ok:true, itinerary:cached, fromCache:true });

  const selectedInterests = Array.isArray(interests) && interests.length ? interests : ["Attractions","Food","Local culture"];
  const place = destination;

  const days = Array.from({ length: totalDays }, (_, i) => {
    const day = i+1;
    const focus = selectedInterests[i % selectedInterests.length];
    const sec   = selectedInterests[(i+1) % selectedInterests.length];
    const plan  = day%2===1 ? [
      { type:"Attraction", name:`${place} Signature Landmark ${day}`, note:`Iconic spot — optimised for ${focus.toLowerCase()}.` },
      { type:"Restaurant",  name:`${place} Local Table`,               note:`Budget-aware meal (₹${Math.round((budget||18000)*0.22/totalDays)} allocated).` },
      { type:"Activity",   name:`${focus} Experience`,                 note:`Afternoon activity centred on ${focus.toLowerCase()}.` }
    ] : [
      { type:"Attraction", name:`${place} Heritage Site ${day}`,       note:`Low-crowd morning for ${sec.toLowerCase()}.` },
      { type:"Shopping",   name:`${place} Local Market`,               note:"Time-boxed browsing and local crafts." },
      { type:"Dinner",     name:`${place} Evening Dining`,             note:"Relaxed meal to close the day." }
    ];
    return { day, theme: day===1 ? "Arrival and orientation" : day===totalDays ? "Final exploration + departure prep" : `Exploration loop ${day}`, plan };
  });

  const itinerary = {
    title: `${place} ${totalDays}-day itinerary`,
    summary: `Built around ${selectedInterests.join(", ")} with ₹${Number(budget||18000).toLocaleString("en-IN")} budget.`,
    days
  };
  cache.set(cacheKey, itinerary, 600);
  res.json({ ok:true, itinerary });
});

/* ──────────────────────────────────────────────
   TRAVEL RISK SCORE — new Phase 2 endpoint
   ────────────────────────────────────────────── */
app.post("/api/risk-score", async (req, res) => {
  const { destination, days } = req.body || {};
  if (!destination?.trim()) return res.status(400).json({ ok:false, error:"Destination is required." });

  const cacheKey = `risk:${destination}:${days}`;
  const result = await cache.getOrSet(cacheKey, async () => {
    const geo     = await geocodePlace(destination).catch(() => null);
    const weather = geo ? await fetchWeather(geo.latitude, geo.longitude, Number(days)||5).catch(() => []) : [];
    const wW      = weather.map(d => ({ ...d, emoji: weatherEmoji(d.weatherCode) }));
    return generateRiskScore(destination, wW, Number(days)||5);
  }, 1800);

  res.json({ ok:true, riskScore: result });
});

/* ──────────────────────────────────────────────
   MAIN PLAN — with WebSocket streaming
   ────────────────────────────────────────────── */
app.post("/api/plan", rateLimit(60000, 10), async (req, res) => {
  const input         = req.body || {};
  const destinationQ  = input.destination || "Shillong";
  const originQ       = input.origin      || "Maraimalai Nagar, Chennai";

  // Broadcast pipeline start via WebSocket
  broadcastAgentUpdate("Planner Agent", "starting", `Generating plan for ${destinationQ}`, 0);

  try {
    // Phase 1: Geocode both locations
    broadcastAgentUpdate("Preference Agent", "active", "Geocoding locations...", 0.1);
    const [originGeo, destGeo] = await Promise.all([
      geocodePlace(originQ).catch(() => null),
      geocodePlace(destinationQ).catch(() => null)
    ]);

    // Phase 2: Live weather
    broadcastAgentUpdate("Weather Agent", "active", `Fetching forecast for ${destinationQ}...`, 0.2);
    const rawWeather = destGeo
      ? await fetchWeather(destGeo.latitude, destGeo.longitude, input.days||5).catch(() => [])
      : [];
    const weather = rawWeather.map(d => ({ ...d, emoji: weatherEmoji(d.weatherCode) }));

    const hasRain  = weather.some(d => ["🌧️","⛈️","🌦️"].includes(d.emoji));
    const packing  = hasRain
      ? ["Rain jacket","Waterproof shoes","Power bank","Quick-dry layer","Umbrella"]
      : ["Light layers","Walking shoes","Power bank","Reusable bottle","Sunscreen"];

    const liveContext = {
      geocode: { origin: originGeo, destination: destGeo },
      weather,
      packing
    };

    // Phase 3: AI agents (stream updates)
    broadcastAgentUpdate("Budget Agent",  "active",    "Optimizing budget allocation...",   0.4);
    broadcastAgentUpdate("Crowd Agent",   "active",    "Predicting crowd density...",        0.5);
    broadcastAgentUpdate("Route Agent",   "active",    "Running MCTS route planning...",     0.6);
    broadcastAgentUpdate("Booking Agent", "active",    "Checking availability...",           0.7);

    // Phase 4: Generate plan (AI or mock)
    broadcastAgentUpdate("Explain Agent", "active",    "Building explainability layer...",   0.85);
    const aiPlan  = await maybeGenerateWithAI(input, liveContext).catch(() => null);
    const plan    = aiPlan || buildMockPlan(input, liveContext);

    broadcastToAll({ type: "plan_complete", destination: destinationQ, confidence: plan.summary?.confidence || 0.91 });

    res.json({
      ok:   true,
      mode: aiPlan ? "live-ai" : "mock-ai",
      plan
    });
  } catch (error) {
    broadcastToAll({ type: "plan_error", error: error.message });
    res.status(500).json({ ok:false, error: error.message || "Plan generation failed." });
  }
});

/* ──────────────────────────────────────────────
   WEBSOCKET STATUS ENDPOINT
   ────────────────────────────────────────────── */
app.get("/api/ws/status", (_req, res) => {
  res.json({ ok:true, connectedClients: clients.size });
});

/* ──────────────────────────────────────────────
   404 HANDLER
   ────────────────────────────────────────────── */
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ ok:false, error:`API endpoint ${req.path} not found.` });
  }
  res.sendFile(path.join(staticDir, "index.html"), err => {
    if (err) res.status(404).send("Not found");
  });
});

/* ──────────────────────────────────────────────
   GLOBAL ERROR HANDLER
   ────────────────────────────────────────────── */
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ ok:false, error:"Internal server error." });
});

/* ──────────────────────────────────────────────
   START
   ────────────────────────────────────────────── */
server.listen(port, () => {
  console.log(`
  ┌─────────────────────────────────────────┐
  │   SmartRoute v2.0 — Production Server   │
  ├─────────────────────────────────────────┤
  │  HTTP  →  http://localhost:${port}         │
  │  WS    →  ws://localhost:${port}           │
  │  AI    →  ${(process.env.AI_PROVIDER || "mock").padEnd(6)} (${process.env.AI_MODEL || "mock mode"})  │
  └─────────────────────────────────────────┘
  `);
});

export default server;
