# SmartRoute v2.0 — Setup Guide

## Prerequisites
- Node.js 18+ (check with `node --version`)
- A terminal (VS Code integrated terminal works great)

---

## Step 1 — Install dependencies

```bash
npm install
```

This installs everything: React, Vite, Express, WebSocket, Framer Motion, Leaflet, and all backend libs.

---

## Step 2 — Configure environment

```bash
cp .env.example .env
```

Open `.env` in your editor. The **minimum** to get running:

```env
PORT=8787
AI_PROVIDER=mock          # works without any AI key
JWT_SECRET=any-random-string-here
CORS_ORIGIN=http://localhost:5173
APP_URL=http://localhost:5173
```

Everything else is optional for development.

---

## Step 3 — Start the dev server

```bash
npm run dev
```

This starts **both** the frontend and backend simultaneously:
- **Frontend**: http://localhost:5173 (Vite + React)
- **Backend**: http://localhost:8787 (Express + WebSocket)

---

## Step 4 — Open the app

Go to **http://localhost:5173**

You'll see the splash screen, then the login page.

**Login options:**
- Enter any email + any password (Phase 2 auth accepts anything in mock mode)
- Or click **"Continue as Demo User"**

---

## Step 5 — Test the features

### Dashboard
- Click **"Generate Smart Trip"** → watch the 7 AI agents run
- The WebSocket agent feed appears at the bottom in real-time
- After plan is generated, click **"✦ Why was this plan generated?"** for the Explainability panel

### Map Explorer
- Click **"◈ Find Activities"** → fetches from OpenTripMap API (live, no key needed)
- Map loads with dark Leaflet tiles

### Budget
- Set a total budget with the slider
- Click **"Create Budget"** → tracks categories
- Log expenses and watch the donut chart update

### AI Assistant
- Type any travel question
- In mock mode: smart rule-based responses
- With Claude key: full GPT-quality answers

### Reservations
- Click **"+ New Booking"** to add trips
- Click **"Book Now"** on any booking → Stripe Checkout (mock in dev)

---

## Activating real AI (Claude)

1. Get a free API key at [console.anthropic.com](https://console.anthropic.com)
2. In `.env`:
   ```env
   AI_PROVIDER=claude
   AI_API_KEY=sk-ant-api03-YOUR_KEY_HERE
   AI_MODEL=claude-sonnet-4-6
   ```
3. Restart the server (`Ctrl+C` then `npm run dev`)

Now the chatbot, trip planner, packing list, and risk score all use Claude.

---

## Activating Stripe Payments

1. Create a free account at [stripe.com](https://stripe.com)
2. Get your **test** secret key from the dashboard
3. In `.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
   ```
4. Restart the server
5. Click any **"Book Now"** button → you'll be redirected to real Stripe Checkout
6. Use test card `4242 4242 4242 4242` (any future date, any CVC)

---

## WebSocket live feed

The dashboard shows a live WebSocket feed while plans are generating. To verify it's connected:

```bash
# Check the API
curl http://localhost:8787/api/health
```

You should see `"wsClients": 1` if the browser is connected.

---

## Build for production

```bash
npm run build
```

This outputs the compiled frontend to `static/`. The Express server already serves this folder.

To run in production:
```bash
node server/index.js
```

Then open `http://localhost:8787`

---

## Common issues

| Issue | Fix |
|-------|-----|
| `Cannot find module 'ws'` | Run `npm install` again |
| Map doesn't load | Check browser console — Leaflet loads from CDN, needs internet |
| Chat returns errors | Set `AI_PROVIDER=mock` in `.env` |
| Port already in use | Change `PORT=8788` in `.env` |
| Login doesn't work | Clear `localStorage` in browser devtools |
