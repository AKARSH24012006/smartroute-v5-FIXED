# SmartRoute — Windows Quick Start Guide

## The fix for blank white page

The blank page was caused by `base: "/static/"` in vite.config.js — this is now removed.

---

## Step-by-step for Windows

### 1. Open the project in VS Code
```
File → Open Folder → select smartroute-v3-FINAL
```

### 2. Open Terminal in VS Code
```
Ctrl + ` (backtick)
```

### 3. Install packages
```powershell
npm install
```

This installs React, Vite, Express, Framer Motion, Leaflet, React Router, and all other packages.

### 4. Copy environment file
```powershell
copy .env.example .env
```

The default `.env` works with mock AI — no API keys needed to start.

### 5. Start the app
```powershell
npm run dev
```

You will see:
```
AI → mock (claude-sonnet-4-6)
VITE v6.x.x ready in 315ms
→ Local: http://localhost:5173/
```

### 6. Open browser
Go to: **http://localhost:5173**

---

## Common errors and fixes

| Error | Fix |
|-------|-----|
| Blank white page | Fixed — was `base:"/static/"` in vite.config.js |
| `Cannot find module 'ws'` | Run `npm install` again — it's now optional |
| Port 5173 in use | Vite auto-picks next port (5174) — open that URL |
| `react-router-dom not found` | Run `npm install` |
| Login page blank | Open browser DevTools (F12) → Console tab → see the error |

## How to debug a blank page

1. Open **http://localhost:5173** in browser  
2. Press **F12** to open DevTools  
3. Click **Console** tab  
4. Look for red error messages  
5. The error tells you exactly what's wrong  

---

## If npm run dev crashes

Run the two servers separately in two terminals:

**Terminal 1 (backend):**
```powershell
node server/index.js
```

**Terminal 2 (frontend):**
```powershell
npx vite
```

Then open **http://localhost:5173**

---

## Login
- Email: anything (e.g. `test@srmist.edu.in`)
- Password: anything (e.g. `password123`)
- Or click **"Continue as Demo User"**
