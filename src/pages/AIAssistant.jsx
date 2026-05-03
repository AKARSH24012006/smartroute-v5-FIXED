import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STARTERS = [
  "Plan a 3-day trip to Goa within ₹15,000",
  "Find budget hotels in Shillong under ₹2,000",
  "What should I pack for Munnar hills?",
  "Best places to eat near SRM Kattankulathur",
  "Budget trip from SRM to Pondicherry in a weekend",
];

const AGENTS = [
  { key:"planner",    label:"Planner Agent",    role:"Route optimization",  color:"var(--blue)" },
  { key:"weather",    label:"Weather Agent",    role:"Forecast analysis",   color:"var(--teal)" },
  { key:"crowd",      label:"Crowd Agent",      role:"Density prediction",  color:"var(--purple)" },
  { key:"budget",     label:"Budget Agent",     role:"Spend optimization",  color:"var(--amber)" },
  { key:"preference", label:"Preference Agent", role:"Taste learning",      color:"var(--red)" },
  { key:"booking",    label:"Booking Agent",    role:"Real-time search",    color:"var(--green)" },
  { key:"explain",    label:"Explain Agent",    role:"Decision reasoning",  color:"var(--blue)" },
];

const ACTIVE_AGENTS = new Set(["planner","weather","budget","booking"]);

function TypingDots() {
  return (
    <span style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
      {[0,1,2].map(i => (
        <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--border-mid)", display: "inline-block",
          animation: `dotb 1.2s ${i*0.2}s ease-in-out infinite` }}/>
      ))}
      <style>{`@keyframes dotb{0%,80%,100%{transform:scale(0.6);opacity:0.5}40%{transform:scale(1);opacity:1}}`}</style>
    </span>
  );
}

export default function AIAssistant({ tripCtx, addToast }) {
  const [messages, setMessages] = useState([{
    id: "welcome", role: "assistant",
    content: `Hi! I'm your SmartRoute AI — powered by multi-agent intelligence. I can plan trips, find hotels & flights, analyze budgets, suggest packing lists, and handle emergencies. Ask me anything, or try voice input!`,
    quickActions: STARTERS.slice(0, 3),
  }]);
  const [draft, setDraft]       = useState("");
  const [sending, setSending]   = useState(false);
  const [riskScore, setRisk]    = useState(null);
  const [listening, setListening] = useState(false);
  const [voiceSupported]        = useState(() => "SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  const bottomRef               = useRef(null);
  const recognitionRef          = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  /* ── Voice input (Web Speech API) ── */
  const startVoice = () => {
    if (!voiceSupported) { addToast("Voice not supported in this browser. Use Chrome.", "error"); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "en-IN";
    rec.continuous = false;
    rec.interimResults = false;
    recognitionRef.current = rec;
    rec.onstart  = () => setListening(true);
    rec.onend    = () => setListening(false);
    rec.onerror  = () => { setListening(false); addToast("Voice error. Try again.", "error"); };
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript.trim();
      if (transcript) {
        setDraft(transcript);
        // Auto-send after short delay
        setTimeout(() => send(transcript), 300);
      }
    };
    try { rec.start(); } catch { addToast("Could not start voice.", "error"); setListening(false); }
  };

  const stopVoice = () => { recognitionRef.current?.stop(); setListening(false); };

  useEffect(() => {
    const fetchRisk = async () => {
      try {
        const res  = await fetch("/api/risk-score", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ destination: tripCtx.destination, days: tripCtx.days }) });
        const data = await res.json();
        if (data.ok) setRisk(data.riskScore);
      } catch {}
    };
    fetchRisk();
  }, [tripCtx.destination, tripCtx.days]);

  const send = async (text) => {
    const t = (text || draft).trim();
    if (!t || sending) return;
    setMessages(m => [...m, { id: `u${Date.now()}`, role: "user", content: t }]);
    setDraft(""); setSending(true);
    try {
      const res  = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: t, context: tripCtx,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setMessages(m => [...m, { id: `a${Date.now()}`, role: "assistant",
        content: data.reply, quickActions: data.quickActions || [], cards: data.cards || [] }]);
    } catch (e) { addToast(e.message, "error"); }
    finally { setSending(false); }
  };

  const riskColor = riskScore?.level === "LOW" ? "var(--green)" : riskScore?.level === "MODERATE" ? "var(--amber)" : "var(--red)";

  return (
    <div>
      <div className="section-title">AI Assistant</div>
      <div className="section-sub">Multi-agent travel intelligence powered by Claude AI</div>

      <div className="ai-page-layout">
        {/* Chat window */}
        <div className="chat-window">
          <div className="chat-quick-actions">
            {STARTERS.map(s => (
              <button key={s} className="chat-quick-btn" onClick={() => send(s)}>{s}</button>
            ))}
          </div>

          <div className="chat-messages">
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <motion.div key={msg.id} className={`chat-msg ${msg.role}`}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <div className="chat-avatar" style={msg.role === "user" ? { background: "var(--g-green)" } : {}}>
                    {msg.role === "user" ? "U" : "AI"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="chat-bubble">
                      <div style={{ fontSize: 11, fontWeight: 600, color: msg.role === "user" ? "rgba(255,255,255,0.7)" : "var(--text-3)", marginBottom: 5 }}>
                        {msg.role === "user" ? "You" : "SmartRoute AI"}
                      </div>
                      {msg.content}
                      {msg.cards?.map(card => (
                        <div key={card.title} style={{ marginTop: 10, padding: "10px 12px",
                          background: msg.role === "user" ? "rgba(255,255,255,0.1)" : "var(--bg-muted)",
                          borderRadius: "var(--r-md)", border: `1px solid ${msg.role === "user" ? "rgba(255,255,255,0.15)" : "var(--border)"}` }}>
                          <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 6, color: msg.role === "user" ? "rgba(255,255,255,0.8)" : "var(--blue)" }}>
                            {card.title}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                            {card.items?.map(item => (
                              <span key={item} style={{ fontSize: 12, padding: "2px 9px",
                                background: msg.role === "user" ? "rgba(255,255,255,0.12)" : "var(--bg-white)",
                                color: msg.role === "user" ? "rgba(255,255,255,0.85)" : "var(--text-2)",
                                borderRadius: "var(--r-full)", border: `1px solid ${msg.role === "user" ? "rgba(255,255,255,0.15)" : "var(--border)"}` }}>
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {msg.quickActions?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}>
                        {msg.quickActions.map(qa => (
                          <button key={qa} className="chat-quick-btn" style={{ fontSize: 11.5 }} onClick={() => send(qa)}>{qa}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {sending && (
              <div className="chat-msg assistant">
                <div className="chat-avatar">AI</div>
                <div className="chat-bubble" style={{ padding: "10px 14px" }}><TypingDots /></div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          <div className="chat-input-bar">
            <textarea className="chat-textarea" rows={2}
              placeholder="Ask anything about your trip — plans, hotels, packing, emergencies..."
              value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}/>

            {/* Voice input button */}
            {voiceSupported && (
              <button
                onClick={listening ? stopVoice : startVoice}
                title={listening ? "Stop listening" : "Voice input"}
                style={{
                  width: 42, height: 42, padding: 0, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1.5px solid ${listening ? "var(--red)" : "var(--border)"}`,
                  borderRadius: "var(--r-md)",
                  background: listening ? "rgba(220,38,38,0.08)" : "var(--bg-soft)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  animation: listening ? "pulse-mic 1s ease-in-out infinite" : "none",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={listening ? "var(--red)" : "none"}
                  stroke={listening ? "var(--red)" : "var(--text-2)"} strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>
            )}

            <button className="btn btn-primary" style={{ width: 42, height: 42, padding: 0, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={() => send()} disabled={sending || !draft.trim()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          {listening && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
              style={{ textAlign:"center", fontSize:12.5, color:"var(--red)", marginTop:6,
                display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:"var(--red)", display:"inline-block",
                animation:"pulse-dot 0.8s ease-in-out infinite" }} />
              Listening... speak now
            </motion.div>
          )}
          <style>{`
            @keyframes pulse-mic { 0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,0.3)} 50%{box-shadow:0 0 0 6px rgba(220,38,38,0)} }
            @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }
          `}</style>
        </div>

        {/* Right panel */}
        <div className="ai-panel-side">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Agent Pipeline</span>
              <span className="pill green"><span className="dot-live"/>LIVE</span>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {AGENTS.map(ag => (
                <div key={ag.key} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px",
                  background: "var(--bg-soft)", borderRadius: "var(--r-md)", border: "1.5px solid var(--border)" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: ACTIVE_AGENTS.has(ag.key) ? "var(--green)" : "var(--border-mid)", flexShrink: 0 }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{ag.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>{ag.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Trip Context</span></div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[["From", tripCtx.origin], ["To", tripCtx.destination], ["Days", `${tripCtx.days} days`],
                ["Budget", `₹${(tripCtx.budget || 0).toLocaleString("en-IN")}`], ["Persona", tripCtx.persona]
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-3)" }}>{k}</span>
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {riskScore && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Travel Risk Score</span>
                <span className="pill" style={{ background: `${riskColor}18`, color: riskColor }}>{riskScore.level}</span>
              </div>
              <div className="card-body">
                <div style={{ textAlign: "center", marginBottom: 12 }}>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 36, fontWeight: 800, color: riskColor }}>
                    {riskScore.score}<span style={{ fontSize: 16, fontWeight: 500, color: "var(--text-3)" }}>/10</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>{riskScore.recommendation}</div>
                </div>
                <div className="progress-wrap" style={{ marginBottom: 12 }}>
                  <motion.div className="progress-fill" style={{ background: riskColor }}
                    initial={{ width: 0 }} animate={{ width: `${(riskScore.score / 10) * 100}%` }}
                    transition={{ duration: 0.8 }}/>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
