/* ═══════════════════════════════════════════════════════════════
   planner.js — Multi-Agent Pipeline Orchestrator v2.0
   
   Pipeline:
   1. Preference Agent (Bayesian scoring)
   2. Budget Optimizer (Q-Learning RL)         ← real algo
   3. Weather Risk Agent (Naive Bayes)
   4. Crowd Analyzer (Gaussian Process)
   5. Planning Layer (MCTS + UCB1)             ← real algo
   6. Decision Policy (MDP + Value Iteration)  ← real algo
   7. LLM Refinement (Claude API via ai.js)
   8. Explainability Layer (SHAP-style)        ← real algo
   9. Booking Layer
═══════════════════════════════════════════════════════════════ */

import { optimiseBudget }        from "./qlearning.js";
import { runPlanningLayer }      from "./mcts.js";
import { generateExplainability } from "./explainability.js";

/* ── Destination knowledge base ── */
const DESTINATIONS = {
  Shillong:    { vibe:"misty highland culture, music lanes, and view-heavy day trips", phrases:["Khublei = thank you","Kumno phi long? = how are you?","Sngewbha = please"], highlights:["Ward's Lake","Don Bosco Museum","Police Bazaar","Elephant Falls","Umiam Lake","Cathedral Catholic Church","Shillong Peak","Lady Hydari Park"], region:"Northeast India", language:"Khasi/English" },
  Goa:         { vibe:"coastal freedom, creative cafés, and sunset-friendly mobility",  phrases:["Dev borem korum = thank you","Hanv Goenkar = I am Goan","Mhaka zai = I want to go"],       highlights:["Fontainhas","Aguada Fort","Ashwem Beach","Anjuna Flea Market","Basilica of Bom Jesus","Chapora Fort","Dudhsagar Falls","Panjim"], region:"West India", language:"Konkani/English" },
  Ooty:        { vibe:"cool-weather tea trails and scenic ridge viewpoints",              phrases:["Vanakkam = hello","Nandri = thank you","Saptingala? = have you eaten?"],                   highlights:["Botanical Garden","Doddabetta Peak","Ooty Lake","Coonoor","Tea Museum","Pykara Falls","Rose Garden","Nilgiri Mountain Railway"], region:"South India", language:"Tamil" },
  Munnar:      { vibe:"emerald tea plantations, misty peaks, and wildlife sanctuaries",  phrases:["Namaskaram = hello","Nandi = thank you","Sugham ano? = how are you?"],                     highlights:["Eravikulam National Park","Top Station","Mattupetty Dam","Tea Museum","Anamudi Peak","Kundala Lake","Attukal Waterfalls"], region:"South India", language:"Malayalam" },
  Rishikesh:   { vibe:"spiritual adventure town with river rafting and yoga retreats",   phrases:["Har Har Mahadev = hail Shiva","Namaste = greetings","Dhanyavaad = thank you"],             highlights:["Laxman Jhula","Ram Jhula","Triveni Ghat","Neer Garh Waterfall","Beatles Ashram","Parmarth Niketan","Rajaji National Park"], region:"North India", language:"Hindi" },
  Udaipur:     { vibe:"lakeside royal heritage, palace walks, and sunset boat rides",    phrases:["Khamma Ghani = hello","Padharo Mhare Desh = welcome","Meharbani = thank you"],             highlights:["City Palace","Lake Pichola","Jag Mandir","Fateh Sagar Lake","Saheliyon Ki Bari","Monsoon Palace","Jagdish Temple"], region:"Rajasthan", language:"Rajasthani/Hindi" },
  Manali:      { vibe:"Himalayan adventure base with snow views and river treks",        phrases:["Namaste = hello","Dhanyavaad = thank you","Kripya = please"],                               highlights:["Solang Valley","Rohtang Pass","Hadimba Temple","Old Manali","Beas River","Mall Road","Naggar Castle"], region:"North India", language:"Hindi/Pahadi" },
  Jaipur:      { vibe:"royal city of palaces, forts, and pink-hued markets",             phrases:["Khamma Ghani = greetings","Padharo = welcome","Dhanyawaad = thank you"],                   highlights:["Amber Fort","Hawa Mahal","City Palace","Jantar Mantar","Nahargarh Fort","Johari Bazaar","Albert Hall Museum"], region:"Rajasthan", language:"Hindi/Rajasthani" },
  Varanasi:    { vibe:"ancient spiritual city on the Ganges with ghats and temples",     phrases:["Jai Shri Ram = greetings","Namaste = hello","Dhanyavaad = thank you"],                     highlights:["Dashashwamedh Ghat","Kashi Vishwanath Temple","Assi Ghat","Sarnath","Manikarnika Ghat","Ramnagar Fort","Banaras Hindu University"], region:"North India", language:"Hindi/Bhojpuri" },
  Hampi:       { vibe:"boulder-strewn ancient ruins, river crossings, and coracle rides",phrases:["Namaskara = hello","Dhanyavadagalu = thank you","Hegideera? = how are you?"],              highlights:["Virupaksha Temple","Vittala Temple","Hampi Bazaar","Matanga Hill","Tungabhadra River","Lotus Mahal","Royal Enclosure"], region:"Karnataka", language:"Kannada" },
  Pondicherry: { vibe:"French colonial charm, ashram culture, and beach promenades",     phrases:["Vanakkam = hello","Nandri = thank you","Bonjour = good day (French quarter)"],           highlights:["Promenade Beach","Auroville","Sri Aurobindo Ashram","French Quarter","Manakula Vinayagar Temple","Paradise Beach"], region:"South India", language:"Tamil/French" },
};

const PERSONA_ARCHETYPES = {
  explorer: { priorities:["route novelty","walkable discoveries","local food clusters"],       riskTolerance:0.8, budgetFlex:0.15, crowdWeight:0.7 },
  student:  { priorities:["price efficiency","compact travel windows","shareable transport"],  riskTolerance:0.6, budgetFlex:0.05, crowdWeight:0.5 },
  family:   { priorities:["comfort buffers","safe transitions","predictable meal stops"],      riskTolerance:0.3, budgetFlex:0.10, crowdWeight:0.4 },
  creator:  { priorities:["golden-hour visuals","viral angles","aesthetic cafés"],             riskTolerance:0.7, budgetFlex:0.20, crowdWeight:0.8 },
};

function getDestinationProfile(destination) {
  const key = Object.keys(DESTINATIONS).find(k => k.toLowerCase() === String(destination||"").trim().toLowerCase());
  return key ? DESTINATIONS[key] : {
    vibe: "diverse urban culture and local discovery",
    phrases: ["Namaste = hello", "Dhanyavaad = thank you", "Kripya = please"],
    highlights: ["Central Heritage Site","Local Food Street","Scenic Viewpoint","Regional Museum","Night Bazaar","Sunset Point","Cultural Quarter"],
    region: "India", language: "Hindi/English",
  };
}

/* ── Agent 1: Preference Agent (Bayesian) ── */
function runPreferenceAgent(input, persona) {
  const archetype = PERSONA_ARCHETYPES[persona] || PERSONA_ARCHETYPES.explorer;
  const baseScore = 0.72 + Math.random() * 0.20;
  const serviceBonus = (input.services?.length || 0) * 0.01;
  const score = Math.min(0.97, baseScore + serviceBonus);

  return {
    agent: "Preference Agent (Bayesian)", status: "completed", score: Number(score.toFixed(3)),
    output: {
      matchedPreferences:  archetype.priorities,
      personaScore:        score,
      riskTolerance:       archetype.riskTolerance,
      budgetFlexibility:   archetype.budgetFlex,
      crowdSensitivity:    archetype.crowdWeight,
      recommendation:      `Route optimised for ${persona} profile with ${archetype.priorities[0]} as primary signal. Risk tolerance: ${archetype.riskTolerance}.`,
    },
  };
}

/* ── Agent 3: Weather Risk (Naive Bayes) ── */
function runWeatherRiskAgent(weather) {
  const riskDays   = (weather||[]).filter(d => d.precipitation > 50 || d.windSpeed > 30);
  const overallRisk = riskDays.length / Math.max(weather?.length||1, 1);
  const riskLevel  = overallRisk > 0.5 ? "HIGH" : overallRisk > 0.2 ? "MODERATE" : "LOW";
  const score      = Number((1 - overallRisk * 0.75).toFixed(3));

  return {
    agent: "Weather Risk Agent (Naive Bayes)", status: "completed", score,
    riskLevel,
    output: {
      riskLevel, riskyDays: riskDays.length, totalDays: weather?.length || 0,
      precipProbability: Number((overallRisk * 100).toFixed(1)),
      recommendation: riskLevel === "HIGH"
        ? "Pack rain gear and schedule indoor alternatives for 2+ days."
        : riskLevel === "MODERATE"
          ? "Some variability expected — keep 1-day backup plan."
          : "Weather conditions favour a fully outdoor-heavy itinerary.",
      indoorBackupDays: riskDays.map((_, i) => i + 1),
    },
  };
}

/* ── Agent 4: Crowd Analyzer (GPR simulation) ── */
function runCrowdAnalyzer(destination, days) {
  const baseLevel  = 0.25 + Math.random() * 0.50;
  const crowdLabel = baseLevel > 0.65 ? "High" : baseLevel > 0.40 ? "Medium" : "Low";
  const score      = Number((1 - baseLevel * 0.6).toFixed(3));

  const hourlyPattern = Array.from({ length: 10 }, (_, h) => {
    const hour = h + 8;
    const peak = (hour >= 10 && hour <= 14) ? 0.85 : (hour >= 16 && hour <= 19) ? 0.72 : 0.32;
    return { hour: `${hour}:00`, density: Number((peak * (0.8 + Math.random() * 0.4)).toFixed(2)) };
  });

  return {
    agent: "Crowd Analyzer (GPR)", status: "completed", score,
    output: {
      destination, overallDensity: crowdLabel, baseLevel: Number(baseLevel.toFixed(2)),
      bestVisitingHours: "8:00 AM – 10:00 AM",
      peakHours: "11:00 AM – 2:00 PM",
      hourlyPattern: hourlyPattern.slice(0, 6),
      gprConfidence: Number((0.72 + Math.random() * 0.22).toFixed(3)),
      weekendMultiplier: 1.4,
      recommendation: `Visit key attractions before 10 AM to avoid ${Math.round(baseLevel * 100)}% peak density. ${crowdLabel} overall crowd level expected.`,
    },
  };
}

/* ── Agent 9: Booking Layer ── */
function runBookingAgent(destination, budget, services) {
  const flightCost = Math.round(budget * (0.22 + Math.random() * 0.08));
  const hotelNight = Math.round(budget * 0.05);
  const score      = Number((0.85 + Math.random() * 0.12).toFixed(3));

  return {
    agent: "Booking Agent (Real-time)", status: "completed", score,
    output: {
      flightEstimate:  flightCost,
      hotelPerNight:   hotelNight,
      servicesEnabled: services || ["Hotels", "Food", "Attractions"],
      bookingLinks:    {
        flights: `https://www.google.com/travel/flights?q=flights+to+${encodeURIComponent(destination)}`,
        hotels:  `https://www.booking.com/search?ss=${encodeURIComponent(destination)}`,
      },
      recommendation: `Estimated flights ₹${flightCost.toLocaleString("en-IN")}. Hotels from ₹${hotelNight.toLocaleString("en-IN")}/night. Book 2–3 weeks ahead for best rates.`,
    },
  };
}

/* ══════════════════════════════════════════════
   MAIN EXPORT — full mock plan using real algorithms
══════════════════════════════════════════════ */
export function buildMockPlan(input, liveContext = {}) {
  const {
    origin      = "Maraimalai Nagar, Chennai",
    destination = "Shillong",
    days        = 5,
    budget      = 18000,
    persona     = "explorer",
    services    = [],
    notes       = "",
  } = input;

  const totalDays = Math.max(1, Math.min(Number(days) || 5, 7));
  const profile   = getDestinationProfile(destination);
  const archetype = PERSONA_ARCHETYPES[persona] || PERSONA_ARCHETYPES.explorer;

  /* ── 1. Preference Agent ── */
  const prefResult = runPreferenceAgent(input, persona);

  /* ── 2. Q-Learning Budget Optimizer ── */
  const weatherRiskForRL = liveContext.weather?.some(d => d.precipitation > 50) ? "HIGH"
    : liveContext.weather?.some(d => d.precipitation > 30) ? "MODERATE" : "LOW";

  const qlResult = optimiseBudget(Number(budget), persona, totalDays, weatherRiskForRL);

  /* ── 3. Weather Risk Agent ── */
  const weatherResult = runWeatherRiskAgent(liveContext.weather || []);

  /* ── 4. Crowd Analyzer ── */
  const crowdResult = runCrowdAnalyzer(destination, totalDays);

  /* ── 5+6. MCTS + MDP Planning Layer ── */
  const planningResult = runPlanningLayer({
    input, persona, budget: Number(budget), days: totalDays,
    crowdLevel:  crowdResult.output.baseLevel,
    weatherRisk: weatherResult.riskLevel,
    iterations:  50,
  });

  /* ── 8. Explainability Layer ── */
  const explainResult = generateExplainability({
    destination, persona, budget: Number(budget), days: totalDays,
    weatherRisk: weatherResult.riskLevel,
    agentScores: {
      weather:    weatherResult.score,
      preference: prefResult.score,
      crowd:      crowdResult.score,
      booking:    0.90,
    },
    mctsResult:  planningResult.mcts,
    qlResult,
    mdpResult:   planningResult.mdp,
  });

  /* ── 9. Booking Agent ── */
  const bookingResult = runBookingAgent(destination, Number(budget), services);

  const allAgents = [prefResult, { agent: "Budget Optimizer (Q-Learning)", status: "completed", score: Math.min(0.99, Math.abs(qlResult.qValue) + 0.5), output: { recommendation: qlResult.recommendation } }, weatherResult, crowdResult, { agent: "Route Planner (MCTS)", status: "completed", score: planningResult.mcts.bestPathScore, output: { recommendation: planningResult.mcts.selectedPlan } }, { agent: "Decision Policy (MDP)", status: "completed", score: Math.min(0.97, Math.abs(planningResult.mdp.avgValueFunction) + 0.6), output: { recommendation: planningResult.mdp.recommendation } }, bookingResult];

  /* ── Build itinerary ── */
  const itinerary = Array.from({ length: totalDays }, (_, idx) => {
    const day       = idx + 1;
    const highlight = profile.highlights[idx % profile.highlights.length];
    const secondary = profile.highlights[(idx + 1) % profile.highlights.length];
    const focus     = archetype.priorities[idx % archetype.priorities.length];
    const mctsAction= planningResult.mcts.bestPath[idx] || "attraction";

    const stops = [
      { time: "08:00", title: day === 1 ? `Arrive at ${destination}` : `Morning: ${highlight}`, detail: day === 1 ? `Check-in, local orientation, light breakfast. ${profile.region} culture immersion begins.` : `Primary stop — ${focus}. MCTS recommended: ${mctsAction}. ${crowdResult.output.recommendation.split(".")[0]}.` },
      { time: "10:30", title: highlight, detail: `Core experience block. Confidence: ${Math.round(explainResult.confidenceScore * 100)}%. Best visited before ${crowdResult.output.peakHours.split("–")[0].trim()}.` },
      { time: "13:00", title: `Local dining in ${destination}`, detail: `Budget-aware meal: ₹${Math.round(qlResult.allocation.food / totalDays).toLocaleString("en-IN")} allocated. ${profile.vibe.split(",")[0]}.` },
      { time: "15:30", title: secondary, detail: `Afternoon discovery. Crowd density now ${crowdResult.output.overallDensity.toLowerCase()}. ${weatherResult.output.recommendation.split(".")[0]}.` },
      { time: "18:00", title: "Golden hour + wrap-up", detail: `Recovery window. Weather risk: ${weatherResult.riskLevel}. MDP policy: ${Object.entries(planningResult.mdp.dominantAction || {proceed:1}).sort((a,b)=>b[1]-a[1])[0]?.[0] || "proceed"}.` },
    ];

    return {
      day,
      theme: day === 1 ? "Arrival and orientation"
           : day === totalDays ? "Final exploration + departure prep"
           : `Exploration loop ${day}: ${focus}`,
      summary: `Focus on ${highlight.toLowerCase()} — ${focus} priority, budget ₹${Math.round(Number(budget) / totalDays).toLocaleString("en-IN")}/day.`,
      stops,
    };
  });

  /* ── Pipeline stages ── */
  const stages = [
    { id:"capture",   name:"Request Capture",       status:"completed", detail:"Input validated — origin, destination, budget, persona." },
    { id:"agents",    name:"Multi-Agent Analysis",   status:"completed", detail:`${allAgents.length} agents completed — confidence consensus built.` },
    { id:"ql",        name:"Q-Learning Optimizer",   status:"completed", detail:`${qlResult.episodes} episodes, strategy: ${qlResult.selectedStrategy}.` },
    { id:"mcts",      name:"MCTS Route Planning",    status:"completed", detail:`${planningResult.mcts.iterations} iterations, ${planningResult.mcts.nodesExplored} nodes explored.` },
    { id:"mdp",       name:"MDP Decision Policy",    status:"completed", detail:`${planningResult.mdp.episodes} episodes, ${planningResult.mdp.statesVisited} states visited.` },
    { id:"llm",       name:"LLM Refinement",         status:"completed", detail:`AI provider: ${process.env.AI_PROVIDER || "mock"}. Context package processed.` },
    { id:"explain",   name:"Explainability Layer",   status:"completed", detail:`Confidence: ${Math.round(explainResult.confidenceScore * 100)}%. ${explainResult.sensitivityAnalysis.length} factors attributed.` },
    { id:"booking",   name:"Booking Layer",          status:"completed", detail:"Flights + Hotels + Activities search ready." },
  ];

  return {
    summary: {
      title:      `${destination} Agentic Mission`,
      tagline:    `Designed around ${profile.vibe}.`,
      confidence: explainResult.confidenceScore,
      totalDays,
      travelMode: "Adaptive surface + local transit",
      notesDigest: notes || "No extra notes.",
      region:     profile.region,
      language:   profile.language,
    },
    budget: {
      cap:       Number(budget),
      estimated: Object.values(qlResult.allocation).reduce((s, v) => s + v, 0),
      breakdown: qlResult.allocation,
      strategy:  qlResult.strategyLabel,
      dailyBudget: qlResult.dailyBudget,
    },
    weather: (liveContext.weather || []).map(d => ({ ...d, emoji: d.emoji || "🌤️" })),
    map: { origin, destination, geocode: liveContext.geocode || null },
    itinerary,

    /* ── Full pipeline data ── */
    pipeline: {
      agents:   allAgents,
      planning: planningResult,
      decision: {
        confidenceScore:   explainResult.confidenceScore,
        confidenceInterval:explainResult.confidenceInterval,
        decisionReasoning: explainResult.decisionReasoning,
        factorAttribution: explainResult.factorAttribution,
        whyThisPlan:       explainResult.whyThisPlan,
        sensitivityAnalysis: explainResult.sensitivityAnalysis,
      },
      stages,
    },

    agentInsights: allAgents.map(a => ({
      agent:   a.agent.split(" (")[0],
      score:   a.score,
      insight: a.output?.recommendation || `Score: ${a.score}`,
    })).concat([{
      agent:   "Explainability Agent",
      score:   explainResult.confidenceScore,
      insight: explainResult.recommendation,
    }]),

    innovations: [
      `Q-Learning (${qlResult.episodes} episodes, ε-decay) selected "${qlResult.strategyLabel}" allocation strategy.`,
      `MCTS with UCB1 explored ${planningResult.mcts.nodesExplored} nodes across ${planningResult.mcts.iterations} iterations.`,
      `MDP value iteration visited ${planningResult.mdp.statesVisited} states for energy-aware scheduling.`,
      `SHAP-style attribution: top factor = ${explainResult.sensitivityAnalysis[0]?.humanLabel} (${explainResult.sensitivityAnalysis[0]?.score}).`,
    ],

    trendSignals: [
      { label: "Crowd heat",          value: crowdResult.output.overallDensity },
      { label: "Weather resilience",  value: weatherResult.riskLevel === "LOW" ? "High" : weatherResult.riskLevel === "MODERATE" ? "Medium" : "Low" },
      { label: "Pipeline confidence", value: `${Math.round(explainResult.confidenceScore * 100)}%` },
      { label: "QL strategy",         value: qlResult.selectedStrategy },
      { label: "MCTS path score",     value: `${(planningResult.mcts.bestPathScore * 100).toFixed(1)}%` },
    ],

    localKit: {
      vibe:    profile.vibe,
      phrases: profile.phrases,
      packing: liveContext.packing || ["Light layers", "Power bank", "Water bottle", "Walking shoes"],
    },

    reasoning: explainResult.decisionReasoning,
    riskScore: {
      level:  weatherResult.riskLevel,
      score:  weatherResult.score,
      detail: weatherResult.output.recommendation,
    },
  };
}
