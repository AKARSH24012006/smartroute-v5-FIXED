import { useState } from "react";
import { motion } from "framer-motion";
import CrowdAnalyzer from "../components/CrowdAnalyzer.jsx";
import LanguageTips from "../components/LanguageTips.jsx";
import TripChecklist from "../components/TripChecklist.jsx";

const PERSONAS = [
  { id:"explorer", label:"Explorer",   sub:"Hidden gems" },
  { id:"student",  label:"Student",    sub:"Budget travel" },
  { id:"family",   label:"Family",     sub:"Comfort first" },
  { id:"creator",  label:"Creator",    sub:"Visual stories" },
];
const SERVICES = ["Hotels","Food","Cab rental","Attractions","Language tips","Local events","Rain backup"];
const STOP_COLORS = {
  Attraction: { bg:"var(--blue-dim)",               color:"var(--blue)" },
  Restaurant: { bg:"var(--green-bg)",               color:"var(--green)" },
  Activity:   { bg:"var(--purple-bg)",              color:"var(--purple)" },
  Shopping:   { bg:"rgba(244,114,182,0.10)",        color:"#db2777" },
  Dinner:     { bg:"var(--amber-bg)",               color:"var(--amber)" },
};

export default function Itinerary({ tripCtx, addToast }) {
  const [form, setForm]         = useState({ ...tripCtx });
  const [itinerary, setItin]    = useState(null);
  const [loading, setLoading]   = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  const [activeTab, setActiveTab] = useState("plan");

  const generate = async () => {
    setLoading(true);
    addToast("Building AI itinerary...", "info");
    try {
      const res = await fetch("/api/itinerary", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ destination:form.destination, number_of_days:form.days, budget:form.budget, interests:form.services })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setItin(data.itinerary); setActiveDay(1);
      addToast(`${form.days}-day itinerary ready!`, "success");
    } catch(e) { addToast(e.message, "error"); }
    finally { setLoading(false); }
  };

  const TABS = [
    { id:"plan",     label:"Itinerary Plan" },
    { id:"crowd",    label:"Crowd Analyzer" },
    { id:"language", label:"Language Tips" },
    { id:"checklist",label:"Trip Checklist" },
  ];

  return (
    <div>
      <div className="section-title">Itinerary Planner</div>
      <div className="section-sub">AI-powered day-by-day plans with crowd data, language tips and packing checklist</div>

      <div className="itinerary-page-grid">
        <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
          {/* Config */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Plan Configuration
              </span>
              <span className="pill blue">AI-Powered</span>
            </div>
            <div className="card-body" style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {/* Persona */}
              <div>
                <div className="field-label" style={{ marginBottom:8 }}>Travel Persona</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                  {PERSONAS.map(p=>(
                    <button key={p.id} onClick={()=>setForm(f=>({...f,persona:p.id}))}
                      style={{ padding:"10px 8px", borderRadius:"var(--r-md)", border:`1.5px solid ${form.persona===p.id?"var(--blue)":"var(--border)"}`,
                        background: form.persona===p.id?"var(--blue-dim)":"var(--bg-soft)", cursor:"pointer",
                        color: form.persona===p.id?"var(--blue)":"var(--text-2)", transition:"all 0.15s",
                        display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                      }}>
                      <span style={{ fontSize:13, fontWeight:700 }}>{p.label}</span>
                      <span style={{ fontSize:10.5, color:"inherit", opacity:0.7 }}>{p.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid-2">
                <div className="field-group"><label className="field-label">Origin</label><input className="field-input" value={form.origin} onChange={e=>setForm(f=>({...f,origin:e.target.value}))} /></div>
                <div className="field-group"><label className="field-label">Destination</label><input className="field-input" value={form.destination} onChange={e=>setForm(f=>({...f,destination:e.target.value}))} /></div>
                <div className="field-group"><label className="field-label">Days</label><input type="number" className="field-input" min={1} max={10} value={form.days} onChange={e=>setForm(f=>({...f,days:+e.target.value}))} /></div>
                <div className="field-group"><label className="field-label">Budget (₹)</label><input type="number" className="field-input" step={500} value={form.budget} onChange={e=>setForm(f=>({...f,budget:+e.target.value}))} /></div>
              </div>
              <div>
                <div className="field-label" style={{ marginBottom:8 }}>Services</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {SERVICES.map(s=>(
                    <button key={s} className={form.services?.includes(s)?"chip active":"chip"}
                      onClick={()=>setForm(f=>({ ...f, services: f.services?.includes(s) ? f.services.filter(x=>x!==s) : [...(f.services||[]),s] }))}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn btn-primary w-full" onClick={generate} disabled={loading}>
                {loading ? "Generating..." : "Generate Itinerary"}
              </button>
            </div>
          </div>

          {/* Feature tabs */}
          <div className="card">
            <div style={{ display:"flex", gap:0, borderBottom:"1px solid var(--border)", overflowX:"auto" }}>
              {TABS.map(t=>(
                <button key={t.id} onClick={()=>setActiveTab(t.id)}
                  style={{ padding:"12px 16px", border:"none", cursor:"pointer", fontSize:13, fontWeight:activeTab===t.id?600:500,
                    color:activeTab===t.id?"var(--blue)":"var(--text-2)", background:"transparent", whiteSpace:"nowrap",
                    borderBottom:`2px solid ${activeTab===t.id?"var(--blue)":"transparent"}`, marginBottom:-1,
                    transition:"all 0.15s",
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ padding:0 }}>
              {activeTab==="plan" && (
                <div style={{ padding:"16px 20px" }}>
                  {!itinerary ? (
                    <div style={{ textAlign:"center", padding:"24px", color:"var(--text-2)", fontSize:13 }}>
                      Generate an itinerary above to see your day-by-day plan here.
                    </div>
                  ) : (
                    <>
                      <p style={{ fontSize:13, color:"var(--text-2)", marginBottom:14 }}>{itinerary.summary}</p>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
                        {itinerary.days.map(d=>(
                          <button key={d.day} className={activeDay===d.day?"chip active":"chip"} onClick={()=>setActiveDay(d.day)}>
                            Day {d.day}
                          </button>
                        ))}
                      </div>
                      <div className="timeline">
                        {itinerary.days.filter(d=>d.day===activeDay).map(day=>(
                          <div key={day.day}>
                            <div className="timeline-day-header">
                              <div className="timeline-day-num">{day.day}</div>
                              <div>
                                <div className="timeline-day-title">{day.theme}</div>
                              </div>
                            </div>
                            <div className="timeline-stops">
                              {day.plan.map((stop,i)=>{
                                const meta = STOP_COLORS[stop.type] || STOP_COLORS.Activity;
                                return (
                                  <motion.div key={i} className={`timeline-stop ${i===0?"highlight":""}`}
                                    initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.08}}>
                                    <div className="stop-time">{`${8+i*2}:00`}</div>
                                    <div className="stop-body">
                                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                                        <span style={{ fontSize:11, background:meta.bg, color:meta.color, padding:"2px 7px", borderRadius:"var(--r-full)", fontWeight:600 }}>{stop.type}</span>
                                        <div className="stop-title">{stop.name}</div>
                                      </div>
                                      <div className="stop-detail">{stop.note}</div>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              {activeTab==="crowd" && <div style={{ padding:"16px 20px" }}><CrowdAnalyzer destination={form.destination} addToast={addToast} /></div>}
              {activeTab==="language" && <div style={{ padding:"16px 20px" }}><LanguageTips destination={form.destination} /></div>}
              {activeTab==="checklist" && <div style={{ padding:"16px 20px" }}><TripChecklist destination={form.destination} persona={form.persona} days={form.days} addToast={addToast} /></div>}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Budget Overview</span></div>
            <div className="card-body">
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:24, fontWeight:800, color:"var(--text)", letterSpacing:"-0.02em", marginBottom:14 }}>₹{form.budget.toLocaleString("en-IN")}</div>
              {[["Stay",35,"var(--purple)"],["Food",22,"var(--green)"],["Activities",18,"#db2777"],["Transit",15,"var(--amber)"]].map(([l,p,c])=>(
                <div key={l} style={{ marginBottom:10 }}>
                  <div className="budget-cat-row"><div className="budget-cat-dot" style={{background:c}}/><span className="budget-cat-label">{l}</span><span className="budget-cat-pct">{p}%</span></div>
                  <div className="progress-wrap"><div className="progress-fill" style={{width:`${p}%`,background:c}}/></div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Smart Tips</span></div>
            <div className="card-body" style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {["Book hotels 2 weeks early for 15% savings","Visit attractions before 10 AM for 40% less crowd","Street food saves ₹400–800 daily vs restaurants","Group bookings unlock 10–20% transport discounts"].map((tip,i)=>(
                <div key={i} style={{ display:"flex", gap:8, fontSize:12.5, color:"var(--text-2)", lineHeight:1.5 }}>
                  <span style={{ color:"var(--blue)", flexShrink:0, fontWeight:700 }}>→</span>{tip}
                </div>
              ))}
            </div>
          </div>

          {/* Standalone Language Tips in sidebar */}
          <LanguageTips destination={form.destination} />
        </div>
      </div>
    </div>
  );
}
