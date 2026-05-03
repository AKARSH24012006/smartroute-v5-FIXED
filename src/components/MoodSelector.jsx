/* ═══════════════════════════════════════════════════════
   MoodSelector — Trip Mood Mode picker
   Uses existing chip/card CSS — zero design changes.
   Moods map to personas in tripCtx.
   ═══════════════════════════════════════════════════════ */

import { motion } from "framer-motion";

const MOODS = [
  { id: "chill",     emoji: "🌊", label: "Chill",     desc: "Relax & unwind",   persona: "relaxed",   color: "var(--teal)" },
  { id: "adventure", emoji: "⚡", label: "Adventure",  desc: "Thrill & explore", persona: "explorer",  color: "var(--amber)" },
  { id: "luxury",    emoji: "💎", label: "Luxury",     desc: "Premium & lavish", persona: "luxury",    color: "var(--purple)" },
  { id: "budget",    emoji: "💰", label: "Budget",     desc: "Smart savings",    persona: "student",   color: "var(--green)" },
];

export default function MoodSelector({ tripCtx, setTripCtx }) {
  const current = MOODS.find(m => m.persona === tripCtx?.persona) || null;

  const select = (mood) => {
    setTripCtx(ctx => ({ ...ctx, persona: mood.persona, mood: mood.id }));
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {MOODS.map(mood => {
        const active = current?.id === mood.id;
        return (
          <motion.button
            key={mood.id}
            onClick={() => select(mood)}
            whileHover={{ y: -2, transition: { duration: 0.12 } }}
            whileTap={{ scale: 0.97 }}
            style={{
              display:        "flex",
              alignItems:     "center",
              gap:            6,
              padding:        "7px 13px",
              border:         `1.5px solid ${active ? mood.color : "var(--border)"}`,
              borderRadius:   "var(--r-full)",
              background:     active ? `${mood.color}15` : "var(--bg-soft)",
              cursor:         "pointer",
              transition:     "all 0.15s",
              fontSize:       13,
              fontWeight:     active ? 700 : 500,
              color:          active ? mood.color : "var(--text-2)",
              fontFamily:     "inherit",
            }}
            title={mood.desc}
          >
            <span>{mood.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

export { MOODS };
