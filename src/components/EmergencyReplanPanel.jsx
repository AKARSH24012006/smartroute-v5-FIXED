/* ═══════════════════════════════════════════════════════════════
   EmergencyReplanPanel.jsx
   
   REAL data sources (all free, no paid key):
   - Open-Meteo  → live weather alerts
   - Overpass/OSM → real nearby hotels, hospitals, transit stops
   - Wikipedia REST → destination summary
   - Deep-links  → MakeMyTrip, Booking, IRCTC, OYO, Ola, Uber
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FeatureShell from "./FeatureShell.jsx";

const SEVERITY_COLORS = {
  extreme: { bg: "var(--red-bg)",   border: "#dc2626", text: "var(--red)",   badge: "#dc2626" },
  severe:  { bg: "var(--amber-bg)", border: "#d97706", text: "var(--amber)", badge: "#d97706" },
  warning: { bg: "var(--blue-dim)", border: "#2563eb", text: "var(--blue)",  badge: "#2563eb" },
};

const ICON = {
  hotel:      "🏨",
  guest_house:"🏠",
  hostel:     "🛏️",
  hospital:   "🏥",
  clinic:     "🩺",
  pharmacy:   "💊",
  police:     "👮",
  bus_stop:   "🚌",
  station:    "🚉",
  halt:       "🚏",
  taxi:       "🚖",
  museum:     "🏛️",
  restaurant: "🍽️",
  cafe:       "☕",
  viewpoint:  "🌅",
  attraction: "🎯",
  park:       "🌳",
  default:    "📍",
};

function getIcon(type) {
  return ICON[type] || ICON.default;
}

/* ── Tab component ── */
function Tab({ label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        padding: "6px 14px",
        borderRadius: "var(--r-full)",
        background: active ? "var(--blue)" : "transparent",
        color: active ? "#fff" : "var(--text-2)",
        fontSize: "0.78rem",
        fontWeight: 600,
        cursor: "pointer",
        border: active ? "none" : "1.5px solid var(--border)",
        transition: "all .2s",
        display: "flex",
        alignItems: "center",
        gap: "5px",
      }}
    >
      {label}
      {badge ? (
        <span style={{
          background: active ? "rgba(255,255,255,0.25)" : "var(--red)",
          color: "#fff",
          borderRadius: "999px",
          padding: "1px 6px",
          fontSize: "0.68rem",
          fontWeight: 700,
        }}>{badge}</span>
      ) : null}
    </button>
  );
}

/* ── Alert Banner ── */
function AlertBanner({ alert }) {
  const c = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.warning;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: c.bg,
        border: `1.5px solid ${c.border}`,
        borderRadius: "var(--r-md)",
        padding: "12px 14px",
        marginBottom: "8px",
        display: "flex",
        gap: "10px",
        alignItems: "flex-start",
      }}
    >
      <span style={{ fontSize: "1.4rem" }}>{alert.emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
          <strong style={{ fontSize: "0.85rem", color: c.text }}>{alert.title}</strong>
          <span style={{
            background: c.badge, color: "#fff",
            borderRadius: "999px", padding: "1px 7px",
            fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase",
          }}>{alert.severity}</span>
          <span style={{ fontSize: "0.72rem", color: "var(--text-3)", marginLeft: "auto" }}>{alert.label}</span>
        </div>
        <p style={{ fontSize: "0.78rem", color: "var(--text-2)", margin: "0 0 4px" }}>{alert.detail}</p>
        <p style={{ fontSize: "0.75rem", color: c.text, fontWeight: 600, margin: 0 }}>
          💡 {alert.recommendation}
        </p>
      </div>
    </motion.div>
  );
}

/* ── Card for a place/hotel/service ── */
function PlaceCard({ item, linkLabel, linkUrl, linkIcon }) {
  return (
    <div style={{
      background: "var(--bg-white)",
      border: "1.5px solid var(--border)",
      borderRadius: "var(--r-md)",
      padding: "11px 13px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
    }}>
      <span style={{ fontSize: "1.3rem" }}>{getIcon(item.type)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.name}
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {item.distKm && <span style={{ fontSize: "0.7rem", color: "var(--text-3)" }}>📍 {item.distKm} km</span>}
          {item.type    && <span style={{ fontSize: "0.7rem", color: "var(--text-3)", textTransform: "capitalize" }}>{item.type.replace("_"," ")}</span>}
          {item.stars   && <span style={{ fontSize: "0.7rem", color: "var(--amber)" }}>{"★".repeat(Math.round(item.stars))}</span>}
          {item.phone   && <span style={{ fontSize: "0.7rem", color: "var(--green)" }}>📞 {item.phone}</span>}
        </div>
      </div>
      <div style={{ display: "flex", gap: "5px" }}>
        {item.mapsUrl && (
          <a href={item.mapsUrl} target="_blank" rel="noopener noreferrer"
            style={{ padding: "5px 9px", borderRadius: "var(--r-sm)", background: "var(--bg-soft)", color: "var(--text-2)", fontSize: "0.72rem", fontWeight: 600, border: "1px solid var(--border)", textDecoration: "none" }}>
            🗺️
          </a>
        )}
        {(linkUrl || item.bookingUrl) && (
          <a href={linkUrl || item.bookingUrl} target="_blank" rel="noopener noreferrer"
            style={{ padding: "5px 9px", borderRadius: "var(--r-sm)", background: "var(--blue-dim)", color: "var(--blue)", fontSize: "0.72rem", fontWeight: 600, border: "1px solid var(--blue-border)", textDecoration: "none" }}>
            {linkIcon || "Book →"}
          </a>
        )}
      </div>
    </div>
  );
}

/* ── Booking Link Buttons ── */
function BookingLinks({ links, category, label }) {
  const cats = links?.[category];
  if (!cats) return null;
  return (
    <div>
      <p style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", margin: "0 0 6px" }}>{label}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {Object.entries(cats).map(([platform, url]) => (
          <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
            style={{
              padding: "6px 12px",
              borderRadius: "var(--r-full)",
              background: "var(--bg-soft)",
              color: "var(--text)",
              fontSize: "0.74rem",
              fontWeight: 600,
              border: "1.5px solid var(--border)",
              textDecoration: "none",
              textTransform: "capitalize",
            }}>
            {platform} ↗
          </a>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════
   MAIN COMPONENT
══════════════════════════ */
export default function EmergencyReplanPanel({ origin, destination, itinerary, days }) {
  const [tab, setTab] = useState("alerts");
  const [alertData, setAlertData] = useState(null);
  const [emergencyData, setEmergencyData] = useState(null);
  const [replanData, setReplanData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [replanLoading, setReplanLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoChecked, setAutoChecked] = useState(false);

  /* Auto-check weather alerts on mount if destination set */
  useEffect(() => {
    if (destination && !autoChecked) {
      setAutoChecked(true);
      fetchAlerts();
    }
  }, [destination]);

  const fetchAlerts = useCallback(async () => {
    if (!destination) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/live-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, days: days || 5 }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Alert fetch failed");
      setAlertData(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [destination, days]);

  const fetchEmergency = useCallback(async () => {
    if (!destination) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/emergency-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Emergency fetch failed");
      setEmergencyData(data);
      setTab("emergency");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [origin, destination]);

  const triggerReplan = useCallback(async () => {
    if (!destination) return;
    setReplanLoading(true);
    setError("");
    try {
      const res = await fetch("/api/replan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination, itinerary: itinerary || [], days: days || 5 }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Replan failed");
      setReplanData(data);
      setTab("replan");
    } catch (e) {
      setError(e.message);
    } finally {
      setReplanLoading(false);
    }
  }, [origin, destination, itinerary, days]);

  const alertCount = alertData?.alerts?.length || 0;
  const criticalCount = alertData?.alerts?.filter(a => a.severity === "extreme" || a.severity === "severe").length || 0;
  const shouldReplan = alertData?.shouldReplan || false;

  return (
    <FeatureShell
      feature="Feature 8 — UPGRADED"
      title="Emergency Replan"
      subtitle="Live alerts + real-time OSM data"
      icon="⚡"
      loading={loading && tab === "alerts"}
      error={error}
      defaultExpanded={false}
      action={
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button className="button button-primary" type="button" onClick={fetchAlerts} disabled={loading}>
            {loading ? "Checking..." : "🔄 Check Live Alerts"}
          </button>
          <button className="button" type="button"
            onClick={fetchEmergency} disabled={loading}
            style={{ background: "var(--amber-bg)", color: "var(--amber)", border: "1.5px solid var(--amber)" }}>
            🏨 Find Nearby Help
          </button>
          {shouldReplan && (
            <motion.button
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="button" type="button"
              onClick={triggerReplan} disabled={replanLoading}
              style={{ background: "var(--red)", color: "#fff", border: "none", fontWeight: 700 }}>
              {replanLoading ? "Replanning..." : "⚡ Emergency Replan"}
            </motion.button>
          )}
        </div>
      }
    >
      <div style={{ padding: "0 2px" }}>

        {/* Source badge */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
          {["Open-Meteo","OpenStreetMap","Wikipedia","MakeMyTrip","IRCTC","OYO"].map(src => (
            <span key={src} style={{
              padding: "2px 8px", borderRadius: "var(--r-full)",
              background: "var(--blue-dim)", color: "var(--blue)",
              fontSize: "0.64rem", fontWeight: 600, border: "1px solid var(--blue-border)",
            }}>{src}</span>
          ))}
          <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "var(--text-3)" }}>
            All free APIs · No paid keys
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
          <Tab label="🌦 Alerts"    active={tab === "alerts"}    onClick={() => setTab("alerts")}    badge={criticalCount || null} />
          <Tab label="🏨 Nearby"    active={tab === "emergency"} onClick={() => setTab("emergency")} />
          <Tab label="⚡ Replan"    active={tab === "replan"}    onClick={() => setTab("replan")}    badge={replanData?.replan?.daysReplanned || null} />
          <Tab label="🔗 Bookings"  active={tab === "bookings"}  onClick={() => setTab("bookings")} />
        </div>

        {/* ── ALERTS TAB ── */}
        <AnimatePresence mode="wait">
          {tab === "alerts" && (
            <motion.div key="alerts" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}>
              {!alertData && !loading && (
                <div style={{ padding: "24px", textAlign: "center", color: "var(--text-3)", fontSize: "0.85rem" }}>
                  Click "Check Live Alerts" to fetch real-time weather from Open-Meteo
                </div>
              )}
              {alertData && alertData.alerts.length === 0 && (
                <div style={{ padding: "16px", background: "var(--green-bg)", borderRadius: "var(--r-md)", border: "1.5px solid var(--green)", textAlign: "center" }}>
                  <span style={{ fontSize: "1.5rem" }}>✅</span>
                  <p style={{ color: "var(--green)", fontWeight: 600, marginTop: "6px" }}>No weather alerts for {destination}</p>
                  <p style={{ color: "var(--text-2)", fontSize: "0.78rem" }}>All {alertData.weather?.length} days look clear</p>
                </div>
              )}
              {alertData?.alerts?.map((alert, i) => <AlertBanner key={i} alert={alert} />)}
              {alertData && (
                <div style={{ marginTop: "12px", padding: "10px 12px", background: "var(--bg-soft)", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "0.7rem", color: "var(--text-3)", margin: 0 }}>
                    📡 Source: {alertData.dataSource} · Fetched: {new Date(alertData.fetchedAt).toLocaleTimeString()}
                    {alertData.fromCache ? " · (cached)" : " · (live)"}
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── NEARBY TAB ── */}
          {tab === "emergency" && (
            <motion.div key="emergency" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}>
              {!emergencyData && !loading && (
                <div style={{ padding: "24px", textAlign: "center", color: "var(--text-3)", fontSize: "0.85rem" }}>
                  Click "Find Nearby Help" to fetch real hotels, hospitals & transit from OpenStreetMap
                </div>
              )}
              {emergencyData && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Hotels */}
                  {emergencyData.options?.nearbyHotels?.length > 0 && (
                    <div>
                      <p style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", margin: "0 0 6px" }}>
                        🏨 Hotels near {destination} — Live OSM data
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {emergencyData.options.nearbyHotels.slice(0, 5).map((h, i) => (
                          <PlaceCard key={i} item={h} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Emergency services */}
                  {emergencyData.options?.emergencyServices?.length > 0 && (
                    <div>
                      <p style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", margin: "0 0 6px" }}>
                        🚨 Emergency services — Live OSM data
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {emergencyData.options.emergencyServices.slice(0, 4).map((s, i) => (
                          <PlaceCard key={i} item={s} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transit */}
                  {emergencyData.options?.transitStops?.length > 0 && (
                    <div>
                      <p style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", margin: "0 0 6px" }}>
                        🚌 Nearby transit — Live OSM data
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {emergencyData.options.transitStops.map((t, i) => (
                          <span key={i} style={{ padding: "5px 10px", background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", fontSize: "0.75rem", color: "var(--text)" }}>
                            {getIcon(t.type)} {t.name} · {t.distKm} km
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Emergency contacts */}
                  <div style={{ padding: "12px 14px", background: "var(--red-bg)", borderRadius: "var(--r-md)", border: "1.5px solid var(--red)" }}>
                    <p style={{ fontSize: "0.72rem", color: "var(--red)", fontWeight: 700, textTransform: "uppercase", margin: "0 0 8px" }}>🆘 India Emergency Numbers</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {Object.entries(emergencyData.options?.emergencyContacts || {}).map(([k, v]) => (
                        <a key={k} href={`tel:${v}`} style={{ padding: "4px 10px", background: "var(--red)", color: "#fff", borderRadius: "var(--r-full)", fontSize: "0.72rem", fontWeight: 700, textDecoration: "none", textTransform: "capitalize" }}>
                          {k.replace(/([A-Z])/g, " $1").trim()}: {v}
                        </a>
                      ))}
                    </div>
                  </div>

                  <div style={{ padding: "10px 12px", background: "var(--bg-soft)", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-3)", margin: 0 }}>
                      📡 {emergencyData.dataSource} · {emergencyData.geocoded ? `Coords: ${emergencyData.geocoded.lat.toFixed(3)}, ${emergencyData.geocoded.lon.toFixed(3)}` : "Fallback mode"}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── REPLAN TAB ── */}
          {tab === "replan" && (
            <motion.div key="replan" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}>
              {!replanData && !replanLoading && (
                <div style={{ padding: "24px", textAlign: "center", color: "var(--text-3)", fontSize: "0.85rem" }}>
                  {shouldReplan
                    ? <><span style={{ color: "var(--red)", fontWeight: 700 }}>⚠ Weather alerts detected!</span><br/>Click "Emergency Replan" to get AI-powered alternate itinerary using real OSM venues</>
                    : "Click 'Check Live Alerts' first, then replan if needed"}
                </div>
              )}
              {replanData && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Summary */}
                  <div style={{
                    padding: "14px 16px",
                    background: replanData.replan?.daysReplanned > 0 ? "var(--amber-bg)" : "var(--green-bg)",
                    borderRadius: "var(--r-md)",
                    border: `1.5px solid ${replanData.replan?.daysReplanned > 0 ? "var(--amber)" : "var(--green)"}`,
                  }}>
                    <p style={{ fontSize: "0.88rem", fontWeight: 700, color: replanData.replan?.daysReplanned > 0 ? "var(--amber)" : "var(--green)", margin: "0 0 4px" }}>
                      {replanData.replan?.daysReplanned > 0 ? `⚡ ${replanData.replan.daysReplanned} days replanned` : "✅ No replanning needed"}
                    </p>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-2)", margin: "0 0 6px" }}>{replanData.replan?.summary}</p>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-3)", margin: 0 }}>
                      ID: {replanData.replan?.replanId} · {new Date(replanData.replan?.generatedAt).toLocaleTimeString()}
                    </p>
                  </div>

                  {/* Replanned days */}
                  {replanData.replan?.days?.filter(d => d.replanned).map((day, i) => (
                    <div key={i} style={{ border: "1.5px solid var(--amber)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
                      <div style={{ padding: "10px 14px", background: "var(--amber-bg)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--amber)" }}>Day {day.day} — Replanned</span>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>{day.alert?.emoji} {day.alert?.title}</span>
                      </div>
                      <div style={{ padding: "10px 14px" }}>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-2)", margin: "0 0 8px" }}>{day.replanReason}</p>
                        {day.stops?.filter(s => s.replanned).map((stop, si) => (
                          <div key={si} style={{ padding: "8px 10px", background: "var(--bg-soft)", borderRadius: "var(--r-sm)", marginBottom: "4px", border: "1px solid var(--border)" }}>
                            <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>{stop.title}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-2)", marginTop: "2px" }}>{stop.detail?.slice(0, 120)}…</div>
                            {stop.mapsUrl && (
                              <a href={stop.mapsUrl} target="_blank" rel="noopener noreferrer"
                                style={{ display: "inline-block", marginTop: "4px", fontSize: "0.68rem", color: "var(--blue)", textDecoration: "none" }}>
                                View on Maps →
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Alternate venues */}
                  {replanData.alternateVenues?.length > 0 && (
                    <div>
                      <p style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", margin: "0 0 6px" }}>
                        🏛️ Real alternate venues from OpenStreetMap
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        {replanData.alternateVenues.slice(0, 5).map((v, i) => (
                          <PlaceCard key={i} item={v} />
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ padding: "10px 12px", background: "var(--bg-soft)", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-3)", margin: 0 }}>
                      📡 {replanData.dataSource}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── BOOKINGS TAB ── */}
          {tab === "bookings" && (
            <motion.div key="bookings" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}>
              <p style={{ fontSize: "0.78rem", color: "var(--text-2)", marginBottom: "14px" }}>
                Real booking platform deep-links for {origin} → {destination}. No API key needed — opens directly on the platform.
              </p>
              {(() => {
                const links = (emergencyData?.options?.flightLinks || replanData?.bookingLinks)
                  ? { flights: emergencyData?.options?.flightLinks || replanData?.bookingLinks?.flights, hotels: emergencyData?.options?.flightLinks ? null : replanData?.bookingLinks?.hotels, trains: emergencyData?.options?.trainLinks || replanData?.bookingLinks?.trains, cabs: emergencyData?.options?.cabLinks || replanData?.bookingLinks?.cabs, buses: emergencyData?.options?.busLinks || replanData?.bookingLinks?.buses }
                  : null;
                if (!links) return (
                  <div style={{ padding: "20px", textAlign: "center", color: "var(--text-3)", fontSize: "0.82rem" }}>
                    Click "Find Nearby Help" or "Emergency Replan" to load booking links for {origin} → {destination}
                  </div>
                );
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {links.flights && <BookingLinks links={{ flights: links.flights }} category="flights" label="✈️ Flights" />}
                    {links.hotels && <BookingLinks links={{ hotels: links.hotels }} category="hotels" label="🏨 Hotels" />}
                    {links.trains && <BookingLinks links={{ trains: links.trains }} category="trains" label="🚂 Trains (IRCTC)" />}
                    {links.cabs && <BookingLinks links={{ cabs: links.cabs }} category="cabs" label="🚖 Cabs" />}
                    {links.buses && <BookingLinks links={{ buses: links.buses }} category="buses" label="🚌 Buses" />}
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FeatureShell>
  );
}
