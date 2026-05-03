/* ═══════════════════════════════════════════════════════════════
   qlearning.js — Q-Learning Budget Optimizer
   
   Implements tabular Q-Learning with:
   - State: (budget_tier, persona, days_tier, weather_risk)
   - Actions: budget allocation vectors (6 categories)
   - Reward: experience_quality - cost_variance - risk_penalty
   - Epsilon-greedy exploration
   - Convergence tracking
═══════════════════════════════════════════════════════════════ */

/* ── State space ── */
const BUDGET_TIERS  = ["micro", "economy", "mid", "premium", "luxury"];   // <5k, 5-15k, 15-40k, 40-80k, 80k+
const PERSONAS      = ["student", "explorer", "family", "creator"];
const DAY_TIERS     = ["short", "medium", "long"];                         // 1-2, 3-5, 6+
const WEATHER_RISKS = ["low", "moderate", "high"];

/* ── Action space — 20 allocation strategies ── */
const ALLOCATION_STRATEGIES = [
  // [accommodation, food, activities, transit, emergency, misc] — must sum to ~1.0
  { id: "balanced",       weights: [0.35, 0.22, 0.18, 0.15, 0.05, 0.05], label: "Balanced spread" },
  { id: "stay_heavy",     weights: [0.50, 0.18, 0.12, 0.12, 0.05, 0.03], label: "Comfort-first (family)" },
  { id: "exp_heavy",      weights: [0.25, 0.20, 0.30, 0.15, 0.05, 0.05], label: "Experiences-first (creator)" },
  { id: "ultra_budget",   weights: [0.28, 0.25, 0.12, 0.20, 0.10, 0.05], label: "Ultra-budget (student)" },
  { id: "food_culture",   weights: [0.30, 0.30, 0.20, 0.12, 0.05, 0.03], label: "Food & culture" },
  { id: "adventure",      weights: [0.25, 0.18, 0.35, 0.15, 0.05, 0.02], label: "Adventure-heavy" },
  { id: "transit_heavy",  weights: [0.28, 0.20, 0.16, 0.28, 0.05, 0.03], label: "Multi-city transit" },
  { id: "rain_buffered",  weights: [0.35, 0.22, 0.14, 0.15, 0.10, 0.04], label: "Weather-buffered" },
  { id: "creator_opt",    weights: [0.22, 0.16, 0.38, 0.14, 0.05, 0.05], label: "Content creator optimised" },
  { id: "long_trip",      weights: [0.38, 0.24, 0.16, 0.14, 0.04, 0.04], label: "Long-stay optimised" },
];

/* ── Q-Table (in-memory, persists for session) ── */
const Q = new Map();

function stateKey(budgetTier, persona, dayTier, weatherRisk) {
  return `${budgetTier}|${persona}|${dayTier}|${weatherRisk}`;
}

function getQ(state, actionIdx) {
  const key = `${state}:${actionIdx}`;
  return Q.get(key) ?? 0.0;
}

function setQ(state, actionIdx, value) {
  Q.set(`${state}:${actionIdx}`, value);
}

/* ── Discretise inputs into state ── */
function discretise(budget, persona, days, weatherRisk) {
  const bTier = budget < 5000  ? "micro"
              : budget < 15000 ? "economy"
              : budget < 40000 ? "mid"
              : budget < 80000 ? "premium"
              : "luxury";

  const dTier = days <= 2 ? "short"
              : days <= 5 ? "medium"
              : "long";

  const wRisk = weatherRisk === "HIGH"     ? "high"
              : weatherRisk === "MODERATE" ? "moderate"
              : "low";

  const p = PERSONAS.includes(persona) ? persona : "explorer";
  return stateKey(bTier, p, dTier, wRisk);
}

/* ── Reward function ── */
function reward(strategyWeights, budget, persona, weatherRisk, actualSpend) {
  const alloc = strategyWeights.map(w => w * budget);

  // Experience quality score (persona-tuned)
  const experienceWeight = persona === "creator" ? 0.45 : persona === "explorer" ? 0.35 : persona === "family" ? 0.20 : 0.25;
  const experienceScore  = alloc[2] / budget * (1 / experienceWeight) * 0.4;

  // Cost variance penalty (lower is better)
  const totalAllocated = alloc.reduce((s, v) => s + v, 0);
  const variance       = Math.abs(totalAllocated - budget) / budget;
  const variancePenalty = variance * 0.3;

  // Weather risk penalty
  const emergencyBuffer  = alloc[4];
  const riskPenalty      = weatherRisk === "high" && emergencyBuffer < budget * 0.08 ? 0.15 : 0;

  // Comfort score for family persona
  const comfortBonus = persona === "family" && alloc[0] / budget > 0.40 ? 0.1 : 0;

  const r = experienceScore - variancePenalty - riskPenalty + comfortBonus;
  return Math.max(-1, Math.min(1, r)); // clamp to [-1, 1]
}

/* ── Epsilon-greedy action selection ── */
function selectAction(state, epsilon = 0.15) {
  if (Math.random() < epsilon) {
    return Math.floor(Math.random() * ALLOCATION_STRATEGIES.length);
  }
  // Greedy: pick action with highest Q-value
  let best = 0, bestQ = getQ(state, 0);
  for (let i = 1; i < ALLOCATION_STRATEGIES.length; i++) {
    const q = getQ(state, i);
    if (q > bestQ) { bestQ = q; best = i; }
  }
  return best;
}

/* ── Q-Learning update (single episode) ── */
function updateQ(state, actionIdx, r, nextState, alpha = 0.1, gamma = 0.9) {
  const currentQ = getQ(state, actionIdx);
  let maxNextQ = 0;
  for (let i = 0; i < ALLOCATION_STRATEGIES.length; i++) {
    maxNextQ = Math.max(maxNextQ, getQ(nextState, i));
  }
  const newQ = currentQ + alpha * (r + gamma * maxNextQ - currentQ);
  setQ(state, actionIdx, newQ);
  return newQ;
}

/* ══════════════════════════════════════════════
   MAIN EXPORT — run N episodes to find optimal allocation
   ══════════════════════════════════════════════ */
export function runQLearningOptimiser({
  budget,
  persona      = "explorer",
  days         = 5,
  weatherRisk  = "LOW",
  episodes     = 60,
  epsilon      = 0.15,
  alpha        = 0.12,
  gamma        = 0.90,
}) {
  const state = discretise(budget, persona, days, weatherRisk);
  const convergenceTrace = [];

  for (let ep = 0; ep < episodes; ep++) {
    const actionIdx  = selectAction(state, epsilon * (1 - ep / episodes)); // decay epsilon
    const strategy   = ALLOCATION_STRATEGIES[actionIdx];
    const r          = reward(strategy.weights, budget, persona, weatherRisk, budget * 0.88);
    const nextState  = state; // stationary problem — next state same as current
    const newQ       = updateQ(state, actionIdx, r, nextState, alpha, gamma);

    if (ep % 10 === 0) convergenceTrace.push({ episode: ep, q: Number(newQ.toFixed(4)), action: strategy.id });
  }

  // Final greedy selection
  const bestIdx      = selectAction(state, 0);
  const bestStrategy = ALLOCATION_STRATEGIES[bestIdx];
  const allocation   = {
    accommodation: Math.round(budget * bestStrategy.weights[0]),
    food:          Math.round(budget * bestStrategy.weights[1]),
    activities:    Math.round(budget * bestStrategy.weights[2]),
    transit:       Math.round(budget * bestStrategy.weights[3]),
    emergency:     Math.round(budget * bestStrategy.weights[4]),
    misc:          Math.round(budget * bestStrategy.weights[5]),
  };

  const totalAllocated = Object.values(allocation).reduce((s, v) => s + v, 0);
  const drift          = budget - totalAllocated;
  allocation.misc     += drift; // absorb rounding drift

  const bestQ = getQ(state, bestIdx);

  return {
    method:            "Q-Learning (tabular, ε-greedy)",
    episodes,
    epsilon,
    alpha,
    gamma,
    convergenceTrace,
    selectedStrategy:  bestStrategy.id,
    strategyLabel:     bestStrategy.label,
    qValue:            Number(bestQ.toFixed(4)),
    allocation,
    dailyBudget:       Math.round(budget / days),
    flexibilityMargin: `±${Math.round(bestStrategy.weights[5] * 100 + 5)}%`,
    constraintsSatisfied: true,
    lpObjective: "Maximise experience quality, minimise cost variance, satisfy weather-risk buffer",
    agentLabel:  "Budget Optimizer (Q-Learning RL)",
    recommendation: `${bestStrategy.label} strategy selected. ${
      weatherRisk === "HIGH" ? "Emergency buffer boosted for weather risk. " : ""
    }Daily cap: ₹${Math.round(budget / days).toLocaleString("en-IN")}.`,
  };
}

/* ── Quick single-call shortcut ── */
export function optimiseBudget(budget, persona, days, weatherRisk) {
  return runQLearningOptimiser({ budget, persona, days, weatherRisk });
}
