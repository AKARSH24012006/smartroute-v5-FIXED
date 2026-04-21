/* ═══════════════════════════════════════════════════════════════
   payments.js — Stripe-ready payment endpoints
   
   Uses Stripe Checkout Sessions (no PCI liability on your server).
   Set STRIPE_SECRET_KEY in .env to activate real payments.
   Without the key, returns a safe mock response for development.
═══════════════════════════════════════════════════════════════ */

const STRIPE_KEY     = () => process.env.STRIPE_SECRET_KEY;
const STRIPE_API     = "https://api.stripe.com/v1";
const APP_URL        = () => process.env.APP_URL || "http://localhost:5173";

/* ── Stripe API helper (no SDK needed) ── */
async function stripeRequest(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_KEY()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };

  if (body) {
    opts.body = new URLSearchParams(flattenForStripe(body)).toString();
  }

  const res  = await fetch(`${STRIPE_API}${path}`, opts);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error?.message || `Stripe error ${res.status}`);
  return data;
}

/* ── Stripe requires nested objects as "a[b]=c" ── */
function flattenForStripe(obj, prefix = "") {
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      Object.assign(result, flattenForStripe(val, fullKey));
    } else if (Array.isArray(val)) {
      val.forEach((item, i) => {
        if (typeof item === "object") {
          Object.assign(result, flattenForStripe(item, `${fullKey}[${i}]`));
        } else {
          result[`${fullKey}[${i}]`] = item;
        }
      });
    } else {
      result[fullKey] = val;
    }
  }
  return result;
}

/* ── Mock checkout session for development ── */
function mockCheckoutSession(items, metadata) {
  const total = items.reduce((s, item) => s + item.price * item.quantity, 0);
  return {
    id:          `cs_mock_${Date.now()}`,
    url:         `${APP_URL()}/reservations?mock_payment=success&session=mock_${Date.now()}`,
    amount_total: total * 100,
    currency:    "inr",
    status:      "open",
    metadata,
    mode:        "payment",
    mock:        true,
  };
}

/* ══════════════════════════════════════════════
   HANDLER: Create Checkout Session
   POST /api/payments/checkout
   Body: { items: [{name, price, quantity, image?}], metadata: {type, destination, ...} }
══════════════════════════════════════════════ */
export async function handleCreateCheckout(req, res) {
  const { items, metadata = {}, customer_email } = req.body || {};

  if (!items?.length) {
    return res.status(400).json({ ok: false, error: "Items are required." });
  }

  const validItems = items.map(item => ({
    name:     String(item.name || "Travel Service"),
    price:    Math.max(1, Math.round(Number(item.price || 0))),
    quantity: Math.max(1, Number(item.quantity || 1)),
    image:    item.image || null,
  }));

  /* ── Without Stripe key → mock ── */
  if (!STRIPE_KEY()) {
    const session = mockCheckoutSession(validItems, metadata);
    return res.json({ ok: true, url: session.url, sessionId: session.id, mock: true });
  }

  /* ── Real Stripe Checkout Session ── */
  try {
    const lineItems = validItems.map(item => ({
      price_data: {
        currency:     "inr",
        unit_amount:  item.price * 100, // paise
        product_data: {
          name:   item.name,
          ...(item.image ? { images: [item.image] } : {}),
        },
      },
      quantity: item.quantity,
    }));

    const session = await stripeRequest("/checkout/sessions", "POST", {
      mode:                "payment",
      line_items:          lineItems,
      success_url:         `${APP_URL()}/reservations?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:          `${APP_URL()}/reservations?payment=cancelled`,
      ...(customer_email ? { customer_email } : {}),
      metadata: {
        ...metadata,
        platform: "SmartRoute-SRMIST",
      },
      payment_intent_data: {
        metadata: { ...metadata, platform: "SmartRoute-SRMIST" },
      },
    });

    res.json({ ok: true, url: session.url, sessionId: session.id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}

/* ══════════════════════════════════════════════
   HANDLER: Get Session Status
   GET /api/payments/session/:id
══════════════════════════════════════════════ */
export async function handleGetSession(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ ok: false, error: "Session ID required." });

  if (id.startsWith("cs_mock_") || !STRIPE_KEY()) {
    return res.json({
      ok:     true,
      status: "complete",
      amount: 0,
      mock:   true,
    });
  }

  try {
    const session = await stripeRequest(`/checkout/sessions/${id}`);
    res.json({
      ok:     true,
      status: session.payment_status,
      amount: session.amount_total / 100,
      currency: session.currency,
      metadata: session.metadata,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}

/* ══════════════════════════════════════════════
   HANDLER: Webhook (Stripe → your server)
   POST /api/payments/webhook
   Add to Stripe dashboard: endpoint URL + events
══════════════════════════════════════════════ */
export async function handleWebhook(req, res) {
  const sig     = req.headers["stripe-signature"];
  const secret  = process.env.STRIPE_WEBHOOK_SECRET;

  // Without webhook secret → acknowledge and log
  if (!secret) {
    console.log("[Webhook] Received (no secret configured):", req.body?.type);
    return res.json({ received: true });
  }

  // With Stripe SDK you'd use constructEvent here.
  // For now: log and acknowledge.
  const event = req.body;
  console.log(`[Webhook] ${event?.type} — ${event?.data?.object?.id}`);

  switch (event?.type) {
    case "checkout.session.completed":
      // TODO: mark booking confirmed in DB
      console.log("[Webhook] Payment confirmed:", event.data.object.id);
      break;
    case "payment_intent.payment_failed":
      console.log("[Webhook] Payment failed:", event.data.object.id);
      break;
  }

  res.json({ received: true });
}

/* ── Pre-built booking helpers for UI ── */
export function buildFlightCheckoutItem(flight, passengers = 1) {
  return {
    name:     `${flight.airline || "Flight"} — ${flight.route || ""}`,
    price:    Math.round(Number(String(flight.price || "0").replace(/[^\d]/g, "")) / passengers),
    quantity: passengers,
    image:    null,
  };
}

export function buildHotelCheckoutItem(hotel, nights = 2) {
  return {
    name:     `${hotel.name} — ${nights} night${nights > 1 ? "s" : ""}`,
    price:    Math.round(Number(String(hotel.pricePerNight || hotel.price || "0").replace(/[^\d]/g, ""))),
    quantity: nights,
    image:    hotel.image || null,
  };
}
