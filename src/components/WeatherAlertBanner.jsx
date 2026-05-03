/* ═══════════════════════════════════════════════════════
   WeatherAlertBanner — slim dismissible alert strip
   Uses existing CSS variables — zero design changes.
   ═══════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LEVEL_STYLE = {
  HIGH:     { bg: "rgba(220,38,38,0.08)",  border: "rgba(220,38,38,0.2)",  color: "var(--red)",   icon: "⛈️" },
  MODERATE: { bg: "rgba(217,119,6,0.08)",  border: "rgba(217,119,6,0.2)",  color: "var(--amber)", icon: "🌧️" },
  LOW:      { bg: "rgba(37,99,235,0.06)",  border: "rgba(37,99,235,0.15)", color: "var(--blue)",  icon: "🌤️" },
};

export default function WeatherAlertBanner({ alerts = [], destination = "" }) {
  const [dismissed, setDismissed] = useState(new Set());

  const visible = alerts.filter(a => !dismissed.has(a.day));
  if (!visible.length) return null;

  const dismiss = (day) => setDismissed(prev => new Set([...prev, day]));

  return (
    <AnimatePresence>
      {visible.slice(0, 3).map((alert, i) => {
        const s = LEVEL_STYLE[alert.severity] || LEVEL_STYLE.LOW;
        return (
          <motion.div
            key={`${alert.day}-${i}`}
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0,   height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              background:    s.bg,
              border:        `1px solid ${s.border}`,
              borderRadius:  "var(--r-md)",
              padding:       "9px 14px",
              display:       "flex",
              alignItems:    "center",
              gap:           10,
              marginBottom:  8,
              fontSize:      13,
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
            <span style={{ flex: 1, color: "var(--text-2)", lineHeight: 1.4 }}>
              <strong style={{ color: s.color }}>{alert.type || "Weather Alert"}</strong>
              {" — "}
              {alert.message || `Conditions changing in ${destination}`}
              {alert.day && (
                <span style={{ marginLeft: 6, fontSize: 11.5, color: "var(--text-3)", fontWeight: 500 }}>
                  Day {alert.day}
                </span>
              )}
            </span>
            {alert.shouldReplan && (
              <span style={{
                fontSize: 10.5, fontWeight: 700, padding: "2px 8px",
                background: s.bg, border: `1px solid ${s.border}`,
                color: s.color, borderRadius: "var(--r-full)", flexShrink: 0,
              }}>
                Replan suggested
              </span>
            )}
            <button
              onClick={() => dismiss(alert.day ?? i)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-3)", fontSize: 15, flexShrink: 0,
                width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "var(--r-sm)", transition: "all 0.1s",
              }}
              title="Dismiss"
            >
              ×
            </button>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
