/* ═══════════════════════════════════════════════
   auth.js — JWT middleware + in-memory user store
   (Replace with real DB in production)
   ═══════════════════════════════════════════════ */

import crypto from "crypto";

const JWT_SECRET  = process.env.JWT_SECRET  || "smartroute-dev-secret-2024";
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || "7d";

/* ── Tiny in-memory user store (swap for MongoDB/Postgres in prod) ── */
const users = new Map();

/* ── Manual JWT implementation (no external deps needed) ── */
function base64url(str) {
  return Buffer.from(str).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function sign(payload) {
  const header  = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body    = base64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 7*24*3600 }));
  const sig     = base64url(crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}

function verify(token) {
  try {
    const [header, body, sig] = token.split(".");
    const expectedSig = base64url(crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest());
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, "base64").toString());
    if (payload.exp < Math.floor(Date.now()/1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(password + JWT_SECRET).digest("hex");
}

/* ── Auth middleware ── */
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ ok: false, error: "Authentication required." });
  }

  const payload = verify(token);
  if (!payload) {
    return res.status(401).json({ ok: false, error: "Invalid or expired token." });
  }

  req.user = payload;
  next();
}

/* ── Optional middleware (doesn't block, just attaches user if present) ── */
export function softAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) {
    const payload = verify(token);
    if (payload) req.user = payload;
  }
  next();
}

/* ── Auth route handlers ── */
export function handleRegister(req, res) {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ ok: false, error: "Name, email and password are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ ok: false, error: "Password must be at least 6 characters." });
  }
  if (users.has(email.toLowerCase())) {
    return res.status(409).json({ ok: false, error: "Email already registered." });
  }

  const id = crypto.randomUUID();
  const user = {
    id,
    name: String(name).trim(),
    email: email.toLowerCase().trim(),
    password: hashPassword(password),
    createdAt: new Date().toISOString(),
    trips: [],
    preferences: { persona: "explorer", budget: 18000, homeCity: "" }
  };

  users.set(email.toLowerCase(), user);

  const token = sign({ id, name: user.name, email: user.email });
  const { password: _p, ...safeUser } = user;

  res.status(201).json({ ok: true, token, user: safeUser });
}

export function handleLogin(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "Email and password are required." });
  }

  // Demo user shortcut
  if (email === "demo@srmist.edu.in") {
    const token = sign({ id: "demo", name: "Demo User", email });
    return res.json({ ok: true, token, user: { id: "demo", name: "Demo User", email, initials: "DU" } });
  }

  const user = users.get(email.toLowerCase());
  if (!user || user.password !== hashPassword(password)) {
    return res.status(401).json({ ok: false, error: "Invalid email or password." });
  }

  const token = sign({ id: user.id, name: user.name, email: user.email });
  const { password: _p, ...safeUser } = user;

  res.json({ ok: true, token, user: { ...safeUser, initials: user.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() } });
}

export function handleMe(req, res) {
  const user = users.get(req.user?.email) || { id: req.user?.id, name: req.user?.name, email: req.user?.email };
  const { password: _p, ...safeUser } = user;
  res.json({ ok: true, user: safeUser });
}

export function handleUpdatePreferences(req, res) {
  const email = req.user?.email;
  const user = users.get(email);
  if (!user) return res.status(404).json({ ok: false, error: "User not found." });

  user.preferences = { ...user.preferences, ...(req.body || {}) };
  res.json({ ok: true, preferences: user.preferences });
}
