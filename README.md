# SmartRoute SRMIST v2.0 — Production AI Travel Platform

> Multi-agent AI travel planner built for SRMIST hackathons, internship portfolios, and startup MVPs.

---

## Quick Start (3 commands)

```bash
npm install
cp .env.example .env        # add your API keys
npm run dev                 # http://localhost:5173
```

Demo login: any email + any password, or click **Continue as Demo User**.

---

## What's inside

### Frontend (React + Framer Motion)
| Page | Route | Features |
|------|-------|---------|
| Dashboard | `/` | Hero, live map, Voyager AI Sync, curated destinations, booking cards, real-time agent feed |
| Map Explorer | `/map` | Full-screen Leaflet dark map, activity search, quick trips |
| Budget | `/budget` | SVG donut chart, category sliders, expense logger |
| Itinerary | `/itinerary` | Persona picker, day timeline, AI-generated plans |
| AI Assistant | `/ai` | Chat interface, agent pipeline sidebar, quick actions |
| Reservations | `/reservations` | Tabbed bookings, status pills, new booking modal, Stripe |
| Login / Register | `/login` `/register` | Auth pages with branding |

### Backend (Express + WebSocket)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server status, WS clients, cache stats |
| `/api/auth/register` | POST | Create account (JWT returned) |
| `/api/auth/login` | POST | Sign in (JWT returned) |
| `/api/auth/me` | GET | Get current user (requires Bearer token) |
| `/api/plan` | POST | Full multi-agent trip plan (streams via WS) |
| `/api/itinerary` | POST | Structured day-by-day itinerary |
| `/api/chat` | POST | Claude AI chat with context + fallback |
| `/api/flights/search` | POST | Realistic flight search |
| `/api/hotels/search` | POST | Hotel search with booking URLs |
| `/api/activities/search` | POST | OpenTripMap activities |
| `/api/budget/create` | POST | Create budget |
| `/api/budget/update` | POST | Log expense |
| `/api/budget/suggest` | GET | AI budget suggestions |
| `/api/risk-score` | POST | Travel risk score (AI-powered) |
| `/api/packing-list` | POST | AI packing list |
| `/api/quick-trip` | POST | Nearby places by GPS |
| `/api/emergency-options` | POST | Emergency replanning |
| `/api/crowd-info` | POST | Crowd density predictions |
| `/api/payments/checkout` | POST | Stripe Checkout session |
| `/api/payments/session/:id` | GET | Payment status |
| `/api/payments/webhook` | POST | Stripe webhook |

### AI Algorithms (all custom implementations, no ML libraries)
| Algorithm | File | Details |
|-----------|------|---------|
| Q-Learning | `server/lib/qlearning.js` | 60 episodes, ε-greedy decay, 10 allocation strategies |
| MCTS + UCB1 | `server/lib/mcts.js` | 50 iterations, UCB1 = Q/N + C√(ln N/N) |
| MDP | `server/lib/mcts.js` | Value iteration, 30 episodes, energy-aware scheduling |
| SHAP Attribution | `server/lib/explainability.js` | 7-factor confidence, sensitivity ranking |
| Naive Bayes | `server/lib/planner.js` | Weather risk classification |
| Gaussian Process | `server/lib/planner.js` | Crowd density prediction |

---

## Environment Variables

```env
# Required for dev (mock works without any keys)
PORT=8787
AI_PROVIDER=mock           # change to "claude" when ready

# Claude API (get at console.anthropic.com)
AI_API_KEY=sk-ant-api03-...
AI_MODEL=claude-sonnet-4-6

# JWT (any random string)
JWT_SECRET=your-secret-here

# Stripe (get at dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# CORS
CORS_ORIGIN=http://localhost:5173
APP_URL=http://localhost:5173
```

---

## Project Structure

```
smartroute-v2/
├── src/
│   ├── App.jsx                     ← React Router + auth + toasts
│   ├── styles.css                  ← Complete design system (2000+ lines)
│   ├── main.jsx
│   ├── layout/
│   │   └── AppShell.jsx            ← Sidebar + topbar
│   ├── pages/
│   │   ├── Dashboard.jsx           ← Main dashboard (matches reference UI)
│   │   ├── MapExplorer.jsx
│   │   ├── Budget.jsx
│   │   ├── Itinerary.jsx
│   │   ├── AIAssistant.jsx
│   │   ├── Reservations.jsx
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   ├── components/
│   │   ├── MapView.jsx             ← Leaflet dark map
│   │   ├── ChatFab.jsx             ← Floating AI chat
│   │   ├── ExplainPanel.jsx        ← SHAP explainability modal
│   │   ├── PayButton.jsx           ← Stripe checkout button
│   │   ├── SplashScreen.jsx
│   │   └── Toast.jsx
│   └── hooks/
│       ├── useAgentStream.js       ← WebSocket hook
│       └── useAuth.js              ← JWT hook
├── server/
│   ├── index.js                    ← Express + WebSocket + all routes
│   └── lib/
│       ├── ai.js                   ← Claude API integration
│       ├── api.js                  ← Weather, geocoding, flights, hotels
│       ├── auth.js                 ← JWT auth (no external deps)
│       ├── cache.js                ← In-memory TTL cache
│       ├── planner.js              ← Full 9-agent pipeline orchestrator
│       ├── qlearning.js            ← Q-Learning budget optimizer
│       ├── mcts.js                 ← MCTS + MDP route planner
│       ├── explainability.js       ← SHAP-style explainability
│       └── payments.js             ← Stripe checkout (no SDK)
└── scripts/
    └── dev.js                      ← Runs both client + server
```

---

## Deployment

### Vercel (Frontend)

```bash
# 1. Build frontend
npm run build

# 2. Deploy static/ folder to Vercel
npx vercel --prod

# In Vercel dashboard:
# Output Directory: static
# Framework Preset: Vite
```

### Railway (Backend)

```bash
# 1. Push to GitHub

# 2. Connect repo to Railway (railway.app)
# 3. Set all environment variables in Railway dashboard
# 4. Set start command: node server/index.js
# 5. Railway auto-deploys on push
```

### Full-stack on a single VPS (e.g. AWS EC2 / DigitalOcean)

```bash
# On your server:
git clone https://github.com/YOUR/smartroute-v2
cd smartroute-v2
npm install
npm run build          # builds React → static/
cp .env.example .env   # fill in your keys

# Run with PM2 (keep alive after disconnect)
npm install -g pm2
pm2 start server/index.js --name smartroute
pm2 save
pm2 startup

# Nginx reverse proxy (port 80 → 8787)
# /etc/nginx/sites-available/smartroute:
# server {
#   server_name yourdomain.com;
#   location / { proxy_pass http://localhost:8787; }
# }
```

### Stripe Webhooks (production)

```bash
# 1. Go to stripe.com/dashboard → Webhooks → Add endpoint
# 2. URL: https://yourdomain.com/api/payments/webhook
# 3. Events: checkout.session.completed, payment_intent.payment_failed
# 4. Copy signing secret → STRIPE_WEBHOOK_SECRET in .env
```

---

## Activating Claude AI

1. Get API key at [console.anthropic.com](https://console.anthropic.com)
2. In `.env`: set `AI_PROVIDER=claude` and `AI_API_KEY=sk-ant-...`
3. Restart server — the chatbot, plan generator, and packing list all use Claude automatically
4. Without a key, everything falls back to the high-quality mock responses

---

## Hackathon Talking Points

- **7 AI agents** run in parallel on every plan request
- **Real algorithms**: Q-Learning (tabular, ε-greedy), MCTS (UCB1), MDP (value iteration), SHAP attribution
- **Live WebSocket streaming** — watch agents work in real-time on the dashboard
- **Explainability layer** — every plan shows confidence score, factor attribution, reasoning traces
- **No ML dependencies** — all algorithms implemented from scratch in pure JavaScript
- **Production-ready** — JWT auth, rate limiting, caching, error handling, Stripe payments
