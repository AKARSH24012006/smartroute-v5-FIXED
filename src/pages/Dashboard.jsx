import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import useAgentStream from "../hooks/useAgentStream.js";
import ExplainPanel from "../components/ExplainPanel.jsx";
import PayButton from "../components/PayButton.jsx";
import useLocation from "../hooks/useLocation.js";
import useWeatherAlerts from "../hooks/useWeatherAlerts.js";
import useDestinationImages from "../hooks/useDestinationImages.js";
import WeatherAlertBanner from "../components/WeatherAlertBanner.jsx";
import MoodSelector from "../components/MoodSelector.jsx";

/* ── Real booking URL builders ── */
const BOOK = {
  flight: (from, to, date) =>
    `https://www.makemytrip.com/flights/search?itinerary=${encodeURIComponent(from)}-${encodeURIComponent(to)}-${date||""}`,
  hotel:  (city, cin, cout) =>
    `https://www.makemytrip.com/hotels/${encodeURIComponent(city)}.html`,
  train:  (from, to) =>
    `https://www.irctc.co.in/nget/train-search?fromStation=${encodeURIComponent(from)}&toStation=${encodeURIComponent(to)}`,
  cab:    (from, to) =>
    `https://www.olacabs.com/?pickup=${encodeURIComponent(from)}&drop=${encodeURIComponent(to)}`,
  bus:    (from, to) =>
    `https://www.redbus.in/bus-tickets/${encodeURIComponent(from)}-to-${encodeURIComponent(to)}`,
};

/* ── Destination coordinates ── */
const CITY_COORDS = {
  shillong:[25.5788,91.8933], goa:[15.2993,74.124], ooty:[11.4102,76.695],
  munnar:[10.0889,77.0595], rishikesh:[30.0869,78.2676], udaipur:[24.5854,73.7125],
  jaipur:[26.9124,75.7873], delhi:[28.6139,77.209], mumbai:[19.076,72.8777],
  chennai:[13.0827,80.2707], bangalore:[12.9716,77.5946], manali:[32.2396,77.1887],
  hampi:[15.335,76.462], pondicherry:[11.9416,79.8083], varanasi:[25.3176,83.0064],
  kochi:[9.9312,76.2673], agra:[27.1767,78.0081], kolkata:[22.5726,88.3639],
  hyderabad:[17.385,78.4867], shimla:[31.1048,77.1734], darjeeling:[27.041,88.2663],
};

function getCoords(name) {
  const k = (name||"").toLowerCase().split(",")[0].trim();
  for (const [c, coords] of Object.entries(CITY_COORDS)) {
    if (k.includes(c) || c.includes(k)) return coords;
  }
  return [20.5937, 78.9629];
}

/* ── Leaflet map ── */
function LiveMap({ destination, origin }) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;

    function initMap() {
      if (mapObj.current) { mapObj.current.remove(); mapObj.current = null; }
      const L = window.L;
      const destC = getCoords(destination);
      const origC = getCoords(origin);

      const map = L.map(el, { center: destC, zoom: 7, zoomControl: false, attributionControl: false });
      mapObj.current = map;

      // CartoDB Positron — clean light tiles, free, no API key needed
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
        attribution: "© CartoDB",
      }).addTo(map);

      const destIcon = L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 2px 10px rgba(37,99,235,0.5)"></div>`,
        iconSize: [14,14], iconAnchor: [7,7],
      });
      const origIcon = L.divIcon({
        className: "",
        html: `<div style="width:11px;height:11px;border-radius:50%;background:#d97706;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(217,119,6,0.4)"></div>`,
        iconSize: [11,11], iconAnchor: [5.5,5.5],
      });

      const dm = L.marker(destC, { icon: destIcon }).bindTooltip(destination, { permanent: false, direction: "top", className: "leaflet-tooltip-custom" }).addTo(map);
      const om = L.marker(origC, { icon: origIcon }).bindTooltip(origin?.split(",")[0], { permanent: false, direction: "top" }).addTo(map);
      const line = L.polyline([origC, destC], { color: "#2563eb", weight: 2.5, opacity: 0.65, dashArray: "7 7" }).addTo(map);
      markersRef.current = [dm, om, line];

      const bounds = L.latLngBounds([origC, destC]);
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    function loadLeaflet() {
      if (window.L) { initMap(); return; }
      // Load CSS
      if (!document.getElementById("leaflet-css")) {
        const css = document.createElement("link");
        css.id = "leaflet-css"; css.rel = "stylesheet";
        css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(css);
      }
      // Load JS
      if (!document.getElementById("leaflet-js")) {
        const js = document.createElement("script");
        js.id = "leaflet-js";
        js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        js.onload = initMap;
        document.head.appendChild(js);
      } else {
        // Script tag exists but L not ready — wait
        const wait = setInterval(() => { if (window.L) { clearInterval(wait); initMap(); } }, 100);
      }
    }

    loadLeaflet();
    return () => { if (mapObj.current) { mapObj.current.remove(); mapObj.current = null; } };
  }, []);

  // Update markers when destination/origin changes
  useEffect(() => {
    if (!mapObj.current || !window.L) return;
    const L = window.L;
    const map = mapObj.current;
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    const destC = getCoords(destination);
    const origC = getCoords(origin);
    const destIcon = L.divIcon({ className:"", html:`<div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 2px 10px rgba(37,99,235,0.5)"></div>`, iconSize:[14,14],iconAnchor:[7,7] });
    const origIcon = L.divIcon({ className:"", html:`<div style="width:11px;height:11px;border-radius:50%;background:#d97706;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(217,119,6,0.4)"></div>`, iconSize:[11,11],iconAnchor:[5.5,5.5] });

    const dm = L.marker(destC, { icon: destIcon }).addTo(map);
    const om = L.marker(origC, { icon: origIcon }).addTo(map);
    const line = L.polyline([origC, destC], { color:"#2563eb", weight:2.5, opacity:0.65, dashArray:"7 7" }).addTo(map);
    markersRef.current = [dm, om, line];
    map.fitBounds(L.latLngBounds([origC, destC]), { padding:[30,30], animate:true, duration:1 });
  }, [destination, origin]);

  return (
    <div style={{ width:"100%", height:"100%", position:"relative" }}>
      <div ref={mapRef} style={{ width:"100%", height:"300px", borderRadius:"inherit" }} />
      <style>{`.leaflet-tooltip-custom{background:#fff;border:1.5px solid #e5e7eb;border-radius:6px;font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;font-weight:600;color:#111827;padding:4px 9px;box-shadow:0 2px 8px rgba(0,0,0,0.1)}`}</style>
    </div>
  );
}

/* ── Curated destinations (images loaded dynamically) ── */
const CURATED = [
  { name:"SRM University",  location:"Kattankulathur, TN", tag:"campus",    tagLabel:"Campus",    price:"30 places", img:"https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=75" },
  { name:"Varkala Beach",   location:"South India",         tag:"trending",  tagLabel:"Trending",  price:"₹12,000 avg", img:"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=75" },
  { name:"Munnar Hills",    location:"Hill Station",        tag:"low-crowd", tagLabel:"Low Crowd", price:"₹8,500 avg",  img:"https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400&q=75" },
  { name:"Hampi Ruins",     location:"Karnataka",           tag:"cultural",  tagLabel:"Cultural",  price:"₹6,200 avg",  img:"https://images.unsplash.com/photo-1544036799-f68eba81e0f8?w=400&q=75" },
  { name:"Pondicherry",     location:"Relaxation",          tag:"relax",     tagLabel:"Relax",     price:"₹15,000 avg", img:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=75" },
];


/* ── Dynamic destination card with real image ── */
function DestCard({ dest, onClick }) {
  const { primaryUrl } = useDestinationImages(dest.name === "SRM University" ? "university campus" : dest.name, "travel", 1);
  const isSRM = dest.tag === "campus";
  return (
    <motion.div className="dest-card" whileHover={{ y:-4, transition:{duration:0.18} }} onClick={onClick}
      style={isSRM ? { border:"1.5px solid rgba(124,58,237,.35)", boxShadow:"0 4px 20px rgba(124,58,237,.12)" } : {}}>
      <img className="dest-card-img" src={primaryUrl || dest.img} alt={dest.name} loading="lazy" />
      <div className="dest-card-overlay" />
      <div className={`dest-card-tag tag-${dest.tag}`}
        style={isSRM ? { background:"rgba(124,58,237,.9)", color:"#fff" } : {}}>{dest.tagLabel}</div>
      <div className="dest-card-content">
        <div className="dest-location">{dest.location}</div>
        <div className="dest-name">{dest.name}</div>
        <div className="dest-price">
          {isSRM
            ? <span style={{color:"#c4b5fd"}}>🎓 {dest.price}</span>
            : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>{dest.price}</>
          }
        </div>
      </div>
    </motion.div>
  );
}


const STAGGER = { visible: { transition: { staggerChildren: 0.06 } } };
const FU = { hidden: { opacity:0, y:16 }, visible: { opacity:1, y:0, transition:{ duration:0.35, ease:"easeOut" } } };

function StatCard({ label, value, sub, trend, color }) {
  return (
    <motion.div className="stat-card" variants={FU} whileHover={{ y:-2, transition:{duration:0.15} }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={color ? { color, fontSize:20 } : { fontSize:20 }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      {trend && <div className={`stat-trend ${trend.dir}`}>{trend.dir==="up"?"↑":"↓"} {trend.text}</div>}
    </motion.div>
  );
}

export default function Dashboard({ tripCtx, setTripCtx, addToast }) {
  const [plan, setPlan]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [weather, setWeather]       = useState([]);
  const [flights, setFlights]       = useState([]);
  const [hotels, setHotels]         = useState([]);
  const [flightsLoading, setFL]     = useState(false);
  const [hotelsLoading, setHL]      = useState(false);
  const [emergency, setEmergency]   = useState(null);
  const [emergencyLoading, setEL]   = useState(false);
  const [explainOpen, setExplain]   = useState(false);
  const [searchDest, setSearchDest] = useState(tripCtx.destination);
  const [activeTab, setActiveTab]   = useState("flights"); // flights | hotels | train | cab
  const navigate = useNavigate();
  const { connected, agentEvents }  = useAgentStream();

  /* ── Real-time hooks ── */
  const { location, loading: locLoading, detect: detectLocation } = useLocation();
  const { alerts: weatherAlerts } = useWeatherAlerts(tripCtx.destination, tripCtx.days);
  const { primaryUrl: heroImageUrl } = useDestinationImages(tripCtx.destination, "travel landscape", 1);

  /* Auto-fill origin from GPS when detected */
  useEffect(() => {
    if (location?.city && location.source !== "default") {
      const autoOrigin = location.region
        ? `${location.city}, ${location.region}`
        : location.city;
      // Only update if origin still has the default SRM value
      if (tripCtx.origin?.includes("Maraimalai") || !tripCtx.origin?.trim()) {
        setTripCtx(c => ({ ...c, origin: autoOrigin }));
        addToast(`📍 Location detected: ${location.city}`, "success");
      }
    }
  }, [location]); // eslint-disable-line

  useEffect(() => { setSearchDest(tripCtx.destination); }, [tripCtx.destination]);

  /* ── Generate AI trip plan ── */
  const generateTrip = useCallback(async () => {
    setLoading(true);
    addToast("Multi-agent pipeline started...", "info");
    try {
      const res  = await fetch("/api/plan", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(tripCtx),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setPlan(data.plan);
      if (data.plan?.weather) setWeather(data.plan.weather);
      addToast(`Plan ready! Confidence: ${Math.round((data.plan?.summary?.confidence||0.91)*100)}%`, "success");
    } catch(e) { addToast(e.message||"Plan failed","error"); }
    finally { setLoading(false); }
  }, [tripCtx, addToast]);

  /* ── Fetch flights ── */
  const fetchFlights = useCallback(async () => {
    setFL(true);
    try {
      const date = new Date(Date.now()+7*86400000).toISOString().split("T")[0];
      const res  = await fetch("/api/flights/search", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ origin:tripCtx.origin, destination:tripCtx.destination, departure_date:date, passengers:1 }),
      });
      const data = await res.json();
      if (data.ok) { setFlights(data.flights||[]); addToast(`${data.flights?.length} flights found`, "success"); }
    } catch(e) { addToast(e.message,"error"); }
    finally { setFL(false); }
  }, [tripCtx, addToast]);

  /* ── Fetch hotels ── */
  const fetchHotels = useCallback(async () => {
    setHL(true);
    try {
      const res  = await fetch("/api/hotels/search", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ city:tripCtx.destination, budget:tripCtx.budget }),
      });
      const data = await res.json();
      if (data.ok) { setHotels(data.hotels||[]); addToast(`${data.hotels?.length} hotels found`, "success"); }
    } catch(e) { addToast(e.message,"error"); }
    finally { setHL(false); }
  }, [tripCtx, addToast]);

  /* ── Emergency replan — now uses real /api/replan with Overpass + Open-Meteo ── */
  const emergencyReplan = useCallback(async () => {
    setEL(true);
    addToast("Fetching live weather + real nearby options...", "warning");
    try {
      const res  = await fetch("/api/replan", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          origin: tripCtx.origin,
          destination: tripCtx.destination,
          itinerary: plan?.itinerary || [],
          days: tripCtx.days || 5,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        // Map new shape back to what the UI expects
        const opts = data;
        const firstHotel = opts.alternateVenues?.find(v => v.type?.includes("hotel") || v.type?.includes("guest"));
        const nearbyHotels = opts.alternateVenues?.filter(v => v.type?.includes("hotel") || v.type?.includes("guest") || v.type?.includes("hostel")).slice(0,3).map(h => `${h.name} · ${h.distKm} km`);
        const altFlights = [
          opts.bookingLinks?.flights?.makemytrip ? `MakeMyTrip: ${tripCtx.origin} → ${tripCtx.destination}` : null,
          opts.bookingLinks?.flights?.goibibo    ? `Goibibo redeye option` : null,
          opts.bookingLinks?.flights?.cleartrip  ? `Cleartrip next-day` : null,
        ].filter(Boolean);
        const transportOptions = [
          opts.bookingLinks?.cabs?.ola    ? "Ola Cabs" : null,
          opts.bookingLinks?.cabs?.uber   ? "Uber" : null,
          opts.bookingLinks?.trains?.irctc ? "IRCTC Train" : null,
          opts.bookingLinks?.buses?.redbus ? "RedBus" : null,
        ].filter(Boolean);

        setEmergency({
          alternateFlights: altFlights.length ? altFlights : [`${tripCtx.origin} → ${tripCtx.destination} next departure`],
          nearbyHotels: nearbyHotels?.length ? nearbyHotels : [`${tripCtx.destination} hotels on Booking.com`],
          transportOptions,
          emergencyContacts: { police:"100", ambulance:"108" },
          // full data for richer display
          _full: data,
        });
        addToast(
          data.replan?.daysReplanned > 0
            ? `${data.replan.daysReplanned} day(s) replanned with real OSM venues!`
            : "Live data loaded — no replanning needed",
          "success"
        );
      }
    } catch(e) { addToast(e.message,"error"); }
    finally { setEL(false); }
  }, [tripCtx, plan, addToast]);

  /* ── Search submit ── */
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchDest.trim()) {
      setTripCtx(c => ({ ...c, destination: searchDest.trim() }));
      addToast(`Destination: ${searchDest.trim()}`, "success");
    }
  };

  const fmt = n => `₹${Number(n||0).toLocaleString("en-IN")}`;

  /* ── Booking tab content ── */
  const BookingSection = () => (
    <div style={{ marginBottom:24 }}>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Live Booking</span>
          <div style={{ display:"flex", gap:4 }}>
            {[
              { id:"flights", label:"Flights" },
              { id:"hotels",  label:"Hotels" },
              { id:"train",   label:"Train" },
              { id:"cab",     label:"Cab" },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={activeTab===t.id ? "chip active" : "chip"}
                style={{ fontSize:12 }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card-body">
          {/* FLIGHTS */}
          {activeTab==="flights" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ fontSize:13, color:"var(--text-2)" }}>
                  {tripCtx.origin?.split(",")[0]} → {tripCtx.destination}
                </div>
                <button className="btn btn-primary btn-sm" onClick={fetchFlights} disabled={flightsLoading}>
                  {flightsLoading ? "Searching..." : "Search Flights"}
                </button>
              </div>
              {flights.length===0 ? (
                <div style={{ textAlign:"center", padding:"28px", color:"var(--text-3)", fontSize:13 }}>
                  Click "Search Flights" to find live options
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {flights.slice(0,5).map((f,i) => (
                    <motion.div key={i} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}}
                      style={{ background:"var(--bg-soft)", border:"1.5px solid var(--border)", borderRadius:"var(--r-lg)", padding:"13px 16px", display:"grid", gridTemplateColumns:"1fr auto 1fr auto", alignItems:"center", gap:14, transition:"all 0.15s", cursor:"default" }}
                      whileHover={{ borderColor:"var(--blue-border)", background:"white" }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:14, color:"var(--text)" }}>{f.airline}</div>
                        <div style={{ fontSize:11.5, color:"var(--text-3)", marginTop:1 }}>{f.flightNo} · {f.stops||"Non-stop"}</div>
                      </div>
                      <div style={{ textAlign:"center" }}>
                        <div style={{ fontFamily:"'Sora',sans-serif", fontSize:17, fontWeight:700, color:"var(--text)" }}>{f.departureTime}</div>
                        <div style={{ fontSize:11, color:"var(--text-3)", marginTop:1 }}>{(tripCtx.origin||"").split(",")[0]}</div>
                      </div>
                      <div style={{ textAlign:"center" }}>
                        <div style={{ fontSize:11, color:"var(--text-3)", marginBottom:4 }}>{f.duration}</div>
                        <div style={{ height:1.5, background:"var(--border-mid)", position:"relative" }}>
                          <div style={{ position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-50%)", background:"white", padding:"0 4px", fontSize:10, color:"var(--blue)" }}>✈</div>
                        </div>
                        <div style={{ fontFamily:"'Sora',sans-serif", fontSize:17, fontWeight:700, color:"var(--text)", marginTop:4 }}>{f.arrivalTime}</div>
                        <div style={{ fontSize:11, color:"var(--text-3)", marginTop:1 }}>{tripCtx.destination?.split(",")[0]}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontFamily:"'Sora',sans-serif", fontSize:19, fontWeight:800, color:"var(--blue)" }}>
                          {f.priceFormatted||fmt(f.price)}
                        </div>
                        <div style={{ fontSize:10.5, color:"var(--text-3)", marginBottom:7 }}>per person</div>
                        <a href={f.bookingUrl||BOOK.flight(tripCtx.origin,tripCtx.destination,"")} target="_blank" rel="noopener noreferrer"
                          className="btn btn-primary btn-sm" style={{ textDecoration:"none" }}>
                          Book →
                        </a>
                      </div>
                    </motion.div>
                  ))}
                  <div style={{ textAlign:"center", marginTop:6 }}>
                    <a href={BOOK.flight(tripCtx.origin,tripCtx.destination,"")} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize:13, color:"var(--blue)", textDecoration:"none", fontWeight:600 }}>
                      View all flights on MakeMyTrip →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HOTELS */}
          {activeTab==="hotels" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ fontSize:13, color:"var(--text-2)" }}>Hotels in {tripCtx.destination}</div>
                <button className="btn btn-primary btn-sm" onClick={fetchHotels} disabled={hotelsLoading}>
                  {hotelsLoading ? "Searching..." : "Search Hotels"}
                </button>
              </div>
              {hotels.length===0 ? (
                <div style={{ textAlign:"center", padding:"28px", color:"var(--text-3)", fontSize:13 }}>
                  Click "Search Hotels" to find accommodation
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {hotels.slice(0,5).map((h,i) => {
                    const hotelImgs = [
                      "photo-1566073771259-6a8506099945",
                      "photo-1582719508461-905c673771fd",
                      "photo-1571003123894-1f0594d2b5d9",
                      "photo-1551882547-ff40c63fe2fa",
                      "photo-1540541338537-71e2c2a89289",
                    ];
                    const imgId = hotelImgs[i % hotelImgs.length];
                    const city  = encodeURIComponent(tripCtx.destination || "");
                    const bookLinks = [
                      { label:"MakeMyTrip", url: `https://www.makemytrip.com/hotels/${city}.html`, color:"#e74c3c" },
                      { label:"OYO",        url: `https://www.oyorooms.com/search?location=${city}`, color:"#e74c3c" },
                      { label:"Booking",    url: `https://www.booking.com/search.html?ss=${city}&dest_type=city`, color:"#003580" },
                    ];
                    return (
                    <motion.div key={i} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}}
                      style={{ background:"var(--bg-soft)", border:"1.5px solid var(--border)", borderRadius:"var(--r-lg)", padding:"12px 14px", display:"flex", alignItems:"center", gap:13, transition:"all 0.15s" }}
                      whileHover={{ borderColor:"var(--blue-border)", background:"white" }}>
                      <img
                        src={`https://images.unsplash.com/${imgId}?w=80&h=80&q=75&fit=crop`}
                        alt={h.name}
                        style={{ width:56, height:56, borderRadius:"var(--r-md)", objectFit:"cover", flexShrink:0 }}
                        onError={e => { e.target.style.display="none"; }}
                      />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:14, color:"var(--text)" }}>{h.name}</div>
                        <div style={{ fontSize:12, color:"var(--text-2)", marginTop:2 }}>{h.distanceFromCenter} from centre · {h.cancellationPolicy}</div>
                        <div style={{ display:"flex", gap:4, marginTop:5, flexWrap:"wrap" }}>
                          {(h.amenities||[]).slice(0,3).map(a=>(
                            <span key={a} style={{ fontSize:10.5, padding:"2px 7px", background:"var(--blue-dim)", color:"var(--blue)", borderRadius:"var(--r-full)", fontWeight:500 }}>{a}</span>
                          ))}
                          <span style={{ fontSize:10.5, color:"var(--text-3)", padding:"2px 0" }}>⭐ {h.rating}</span>
                        </div>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div style={{ fontFamily:"'Sora',sans-serif", fontSize:18, fontWeight:800, color:"var(--text)" }}>
                          {h.priceFormatted||fmt(h.pricePerNight)}
                        </div>
                        <div style={{ fontSize:11, color:"var(--text-3)", marginBottom:6 }}>per night</div>
                        <div style={{ display:"flex", gap:5, justifyContent:"flex-end", flexWrap:"wrap" }}>
                          {bookLinks.map(bl => (
                            <a key={bl.label} href={bl.url} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize:10.5, padding:"3px 8px", borderRadius:"var(--r-full)",
                                background:"var(--blue-dim)", color:"var(--blue)", textDecoration:"none", fontWeight:600 }}>
                              {bl.label}
                            </a>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                    );
                  })}
                  <div style={{ textAlign:"center", marginTop:6 }}>
                    <a href={BOOK.hotel(tripCtx.destination)} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize:13, color:"var(--blue)", textDecoration:"none", fontWeight:600 }}>
                      View all hotels on MakeMyTrip →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TRAIN */}
          {activeTab==="train" && (
            <div style={{ textAlign:"center", padding:"24px 20px" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🚂</div>
              <div style={{ fontWeight:600, fontSize:15, color:"var(--text)", marginBottom:6 }}>Train Booking via IRCTC</div>
              <div style={{ fontSize:13, color:"var(--text-2)", marginBottom:20, lineHeight:1.6 }}>
                Book train tickets from {tripCtx.origin?.split(",")[0]} to {tripCtx.destination} on IRCTC — India's official railway booking portal.
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
                <a href={BOOK.train(tripCtx.origin,tripCtx.destination)} target="_blank" rel="noopener noreferrer"
                  className="btn btn-primary" style={{ textDecoration:"none" }}>
                  Book on IRCTC →
                </a>
                <a href={`https://www.confirmtkt.com/train-search?src=${encodeURIComponent(tripCtx.origin?.split(",")[0]||"")}&dst=${encodeURIComponent(tripCtx.destination||"")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="btn btn-ghost" style={{ textDecoration:"none" }}>
                  Check ConfirmTkt →
                </a>
              </div>
            </div>
          )}

          {/* CAB */}
          {activeTab==="cab" && (
            <div style={{ textAlign:"center", padding:"24px 20px" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🚕</div>
              <div style={{ fontWeight:600, fontSize:15, color:"var(--text)", marginBottom:6 }}>Cab & Auto Booking</div>
              <div style={{ fontSize:13, color:"var(--text-2)", marginBottom:20, lineHeight:1.6 }}>
                Book cabs from {tripCtx.origin?.split(",")[0]} to {tripCtx.destination} on Ola or Rapido.
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
                <a href={BOOK.cab(tripCtx.origin,tripCtx.destination)} target="_blank" rel="noopener noreferrer"
                  className="btn btn-primary" style={{ textDecoration:"none", background:"linear-gradient(135deg,#16a34a,#22c55e)" }}>
                  Book on Ola →
                </a>
                <a href={`https://www.rapido.bike`} target="_blank" rel="noopener noreferrer"
                  className="btn btn-ghost" style={{ textDecoration:"none" }}>
                  Rapido Bike/Auto →
                </a>
                <a href={BOOK.bus(tripCtx.origin?.split(",")[0]||"",tripCtx.destination)} target="_blank" rel="noopener noreferrer"
                  className="btn btn-ghost" style={{ textDecoration:"none" }}>
                  RedBus →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={STAGGER}>

      {/* ── Weather Alert Banner ── */}
      <AnimatePresence>
        {weatherAlerts.length > 0 && (
          <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} style={{ marginBottom:12 }}>
            <WeatherAlertBanner alerts={weatherAlerts} destination={tripCtx.destination} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero banner — matches reference exactly ── */}
      <motion.div className="dash-hero" variants={FU}>
        <img
          className="dash-hero-img"
          src={heroImageUrl || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=60"}
          alt={tripCtx.destination}
          style={{ transition: "opacity 0.5s" }}
        />
        <div className="dash-hero-overlay" />
        <div className="dash-hero-content">
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"rgba(255,255,255,0.6)", marginBottom:8 }}>
            AI-POWERED TRAVEL PLANNING
          </div>
          <h1>Plan Smarter. <span>Travel</span><br/>Better.</h1>

          {/* Mood Selector — above search */}
          <div style={{ marginBottom:12 }}>
            <MoodSelector tripCtx={tripCtx} setTripCtx={setTripCtx} />
          </div>

          <form className="hero-search-row" onSubmit={handleSearch}>
            <div className="hero-search-wrap">
              <svg className="hero-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <input className="hero-search-input" placeholder="Where do you want to go?" value={searchDest} onChange={e=>setSearchDest(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ height:44, flexShrink:0, paddingLeft:20, paddingRight:20 }}>
              Generate Smart Trip
            </button>
          </form>

          {/* Location detection status */}
          {locLoading && (
            <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.6)", marginTop:8, display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ animation:"spin360 1s linear infinite", display:"inline-block" }}>⟳</span> Detecting your location...
            </div>
          )}
          {location && !locLoading && location.source !== "default" && (
            <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.6)", marginTop:8 }}>
              📍 {location.city}, {location.region}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Stats row ── */}
      <motion.div className="dash-stats-row" variants={STAGGER}>
        <StatCard label="Total Budget"      value={fmt(tripCtx.budget)}  sub={`${tripCtx.days}-day trip`} trend={{dir:"up",text:"On track"}} />
        <StatCard label="Destination"       value={tripCtx.destination}  sub={tripCtx.origin?.split(",")[0]} />
        <StatCard label="AI Confidence"     value={plan?`${Math.round((plan.summary?.confidence||0.91)*100)}%`:"—"} sub="Multi-agent score" color="var(--green)" />
        <StatCard label="Flights & Transport" value="65%"                sub="of budget" trend={{dir:"up",text:"Optimized"}} />
        <StatCard label="Accommodation"     value="20%"                  sub="of budget" />
      </motion.div>

      {/* ── Map + Voyager AI Sync — matches reference layout ── */}
      <motion.div className="dash-main-grid" variants={FU}>
        {/* Map card */}
        <div className="card map-card" style={{ overflow:"hidden" }}>
          <div className="live-badge"><span className="dot-live" />LIVE TRAFFIC</div>
          <LiveMap destination={tripCtx.destination} origin={tripCtx.origin} />
          <div className="map-controls">
            <button className="map-ctrl-btn" onClick={()=>{ if(window._srMap) window._srMap.zoomIn(); }}>+</button>
            <button className="map-ctrl-btn" onClick={()=>{ if(window._srMap) window._srMap.zoomOut(); }}>−</button>
          </div>
        </div>

        {/* Right panel: Voyager AI + Budget */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Voyager AI Sync — matches reference exactly */}
          <div className="card" style={{ flex:1 }}>
            <div className="card-header">
              <span className="card-title" style={{ fontFamily:"'Sora',sans-serif", fontWeight:700 }}>Voyager AI Sync</span>
              <span className="pill green"><span className="dot-live" />ACTIVE</span>
            </div>
            <div className="card-body" style={{ paddingTop:12, display:"flex", flexDirection:"column", gap:12 }}>
              {/* Agent Alpha */}
              <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"11px 12px", background:"var(--bg-soft)", border:"1.5px solid var(--border)", borderRadius:"var(--r-md)" }}>
                <div style={{ width:34, height:34, borderRadius:"var(--r-md)", background:"var(--blue-dim)", border:"1.5px solid var(--blue-border)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:"var(--blue)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M2 12h4M18 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>Agent Alpha</div>
                  <div style={{ fontSize:12, color:"var(--text-2)", lineHeight:1.45, fontStyle:"italic", marginTop:2 }}>
                    "{plan
                      ? `Plan ready for ${tripCtx.destination}. Confidence: ${Math.round((plan.summary?.confidence||0.91)*100)}%.`
                      : `Analyzing weather patterns for your trip to ${tripCtx.destination}. Probability of rain: 15%. Optimization suggested.`}"
                  </div>
                </div>
                <button onClick={() => setExplain(true)} style={{ background:"none", cursor:"pointer", color:"var(--text-3)", width:28, height:28, borderRadius:"var(--r-sm)", border:"1.5px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </button>
              </div>
              {/* Budget Bot */}
              <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"11px 12px", background:"var(--bg-soft)", border:"1.5px solid var(--border)", borderRadius:"var(--r-md)" }}>
                <div style={{ width:34, height:34, borderRadius:"var(--r-md)", background:"var(--amber-bg)", border:"1.5px solid rgba(217,119,6,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:"var(--amber)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>Budget Bot</div>
                  <div style={{ fontSize:12, color:"var(--text-2)", marginTop:2 }}>
                    {loading ? "Calculating best routes..." : "Calculating best routes..."}
                  </div>
                  <div style={{ height:3, borderRadius:"var(--r-full)", background:"var(--border)", overflow:"hidden", marginTop:5 }}>
                    <div style={{ height:"100%", width:"60%", borderRadius:"var(--r-full)", background:"var(--g-blue)", animation:"agent-load 1.6s ease-in-out infinite" }}/>
                  </div>
                </div>
              </div>
              {/* Generate button */}
              <button className="btn btn-primary w-full" onClick={generateTrip} disabled={loading} style={{ marginTop:4 }}>
                {loading ? (
                  <span style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" style={{ animation:"spin360 0.8s linear infinite" }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Generating...
                  </span>
                ) : "Generate Smart Trip"}
              </button>
              {plan && (
                <button className="btn btn-ghost w-full" onClick={()=>setExplain(true)} style={{ fontSize:12.5 }}>
                  Why was this plan generated? (Explainability)
                </button>
              )}
            </div>
          </div>

          {/* Budget mini — matches reference blue card */}
          <div className="budget-mini-card">
            <div className="budget-mini-label">TOTAL BUDGET</div>
            <div className="budget-mini-value">{fmt(tripCtx.budget)}</div>
            <div className="budget-mini-row"><span>Flights &amp; Transport</span><strong>65%</strong></div>
            <div className="budget-mini-bar"><div className="budget-mini-fill" style={{ width:"65%" }}/></div>
            <div className="budget-mini-row"><span>Accommodation</span><strong>20%</strong></div>
            <div className="budget-mini-bar"><div className="budget-mini-fill" style={{ width:"20%" }}/></div>
          </div>
        </div>
      </motion.div>

      {/* ── Booking section: Flights / Hotels / Train / Cab ── */}
      <motion.div variants={FU}>
        <BookingSection />
      </motion.div>

      {/* ── Weather (when plan available) ── */}
      <AnimatePresence>
        {weather.length > 0 && (
          <motion.div variants={FU} style={{ marginBottom:24 }} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
            <div style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:700, color:"var(--text)", marginBottom:14 }}>
              Live Forecast — {tripCtx.destination}
            </div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {weather.slice(0,5).map((d,i) => (
                <div key={i} className="stat-card" style={{ flex:"1 1 100px", textAlign:"center", minWidth:88 }}>
                  <div style={{ fontSize:24, marginBottom:5 }}>{d.emoji}</div>
                  <div style={{ fontFamily:"'Sora',sans-serif", fontWeight:800, fontSize:17, color:"var(--text)" }}>{d.max}°</div>
                  <div style={{ color:"var(--text-3)", fontSize:11.5, marginTop:2 }}>{d.min}° · {d.label}</div>
                  {d.precipitation>0 && <div style={{ fontSize:10.5, color:"var(--blue)", marginTop:3 }}>{d.precipitation}% rain</div>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Curated for SRMIST — matches reference ── */}
      <motion.div variants={FU} style={{ marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <div>
            <div style={{ fontFamily:"'Sora',sans-serif", fontSize:16, fontWeight:700, color:"var(--text)" }}>Curated for SRMIST</div>
            <div style={{ fontSize:13, color:"var(--text-2)" }}>Based on your recent itinerary searches</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={()=>navigate("/map")} style={{ display:"flex", alignItems:"center", gap:5 }}>
            View All
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
        <div className="curated-grid">
          {CURATED.map(dest => (
            <DestCard
              key={dest.name}
              dest={dest}
              onClick={() => { setTripCtx(c=>({...c,destination:dest.name})); addToast(`Destination: ${dest.name}`,"success"); }}
            />
          ))}
        </div>
      </motion.div>

      {/* ── Live agent stream ── */}
      <AnimatePresence>
        {agentEvents.length > 0 && (
          <motion.div style={{ marginBottom:24 }} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
            <div className="card">
              <div className="card-header">
                <span className="card-title"><span className="dot-live" style={{marginRight:7}}/>Live Agent Stream {connected && <span className="pill green" style={{marginLeft:6,fontSize:10}}>WS</span>}</span>
              </div>
              <div className="card-body" style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {agentEvents.slice(0,5).map(ev => (
                  <motion.div key={ev.id} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}}
                    style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", background:"var(--bg-soft)", borderRadius:"var(--r-sm)", border:"1.5px solid var(--border)", fontSize:12.5, color:"var(--text-2)" }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:ev.status==="active"?"var(--blue)":"var(--green)", flexShrink:0 }}/>
                    <strong style={{ color:"var(--text)", minWidth:120 }}>{ev.agent}</strong>
                    <span>{ev.detail}</span>
                    {ev.score>0 && <span style={{ marginLeft:"auto", color:"var(--blue)", fontWeight:700 }}>{Math.round(ev.score*100)}%</span>}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Confirmed Accommodations — matches reference ── */}
      <motion.div variants={FU} style={{ marginBottom:24 }}>
        <div style={{ fontFamily:"'Sora',sans-serif", fontSize:16, fontWeight:700, color:"var(--text)", marginBottom:14 }}>Confirmed Accommodations</div>
        <div className="bookings-row">
          {[
            { name:"The Grand Regency",  sub:"Deluxe Suite • 2 Nights",        price:"₹8,499", action:"Book Now", color:"#2563eb", img:"https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&q=75" },
            { name:"Urban Transit VIP",  sub:"Premium Van • Airport Drop",      price:"₹1,250", action:"Reserve", color:"#7c3aed", img:"https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=200&q=75" },
          ].map(b => (
            <motion.div key={b.name} className="booking-card" whileHover={{ y:-2 }}>
              <img className="booking-thumb" src={b.img} alt={b.name} loading="lazy" />
              <div style={{ flex:1, minWidth:0 }}>
                <div className="booking-name">{b.name}</div>
                <div className="booking-sub">{b.sub}</div>
                <div className="booking-price">{b.price}</div>
              </div>
              <a href={BOOK.hotel(tripCtx.destination)} target="_blank" rel="noopener noreferrer"
                className="btn btn-sm" style={{ background:b.color, color:"#fff", textDecoration:"none", flexShrink:0 }}>
                {b.action}
              </a>
            </motion.div>
          ))}
          {/* Add more button */}
          <motion.div className="booking-card" style={{ justifyContent:"center", alignItems:"center", cursor:"pointer", minWidth:120, flex:"0 0 auto" }}
            whileHover={{ y:-2 }} onClick={()=>navigate("/reservations")}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, color:"var(--text-3)" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:"var(--bg-muted)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>+</div>
              <span style={{ fontSize:12.5, fontWeight:500 }}>Add Booking</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Emergency Replan ── */}
      <motion.div variants={FU} style={{ marginBottom:24 }}>
        <div className="card" style={{ border:"1.5px solid rgba(220,38,38,0.2)", background:"linear-gradient(135deg,rgba(254,242,242,0.8),rgba(255,255,255,0.9))" }}>
          <div className="card-header">
            <span className="card-title" style={{ color:"var(--red)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight:6 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Emergency Replan
            </span>
            <button className="btn btn-sm" style={{ background:"var(--red)", color:"#fff", border:"none" }} onClick={emergencyReplan} disabled={emergencyLoading}>
              {emergencyLoading ? "Loading..." : "Activate"}
            </button>
          </div>
          <div className="card-body">
            {!emergency ? (
              <p style={{ fontSize:13, color:"var(--text-2)", lineHeight:1.6 }}>
                Flight delayed? Hotel cancelled? Activate emergency replan to instantly get alternate flights, nearby hotels, and backup transport options for your trip from <strong>{tripCtx.origin?.split(",")[0]}</strong> to <strong>{tripCtx.destination}</strong>.
              </p>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--red)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em" }}>Alternate Flights</div>
                  {emergency.alternateFlights?.map((f,i) => (
                    <div key={i} style={{ fontSize:12.5, color:"var(--text-2)", padding:"6px 0", borderBottom:"1px solid var(--border)" }}>{f}</div>
                  ))}
                  <div style={{ display:"flex", gap:5, marginTop:10, flexWrap:"wrap" }}>
                    {emergency._full?.bookingLinks?.flights && Object.entries(emergency._full.bookingLinks.flights).slice(0,3).map(([k,v]) => (
                      <a key={k} href={v} target="_blank" rel="noopener noreferrer"
                        className="btn btn-sm btn-primary" style={{ textDecoration:"none", textTransform:"capitalize", fontSize:11 }}>
                        {k} ↗
                      </a>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--red)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                    Nearby Hotels {emergency._full?.dataSource?.includes("OpenStreetMap") ? "· 📡 Live OSM" : ""}
                  </div>
                  {emergency.nearbyHotels?.map((h,i) => (
                    <div key={i} style={{ fontSize:12.5, color:"var(--text-2)", padding:"6px 0", borderBottom:"1px solid var(--border)" }}>{h}</div>
                  ))}
                  <div style={{ display:"flex", gap:5, marginTop:10, flexWrap:"wrap" }}>
                    {emergency._full?.bookingLinks?.hotels && Object.entries(emergency._full.bookingLinks.hotels).slice(0,3).map(([k,v]) => (
                      <a key={k} href={v} target="_blank" rel="noopener noreferrer"
                        className="btn btn-sm" style={{ textDecoration:"none", background:"var(--g-green)", color:"#fff", fontSize:11, textTransform:"capitalize" }}>
                        {k} ↗
                      </a>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--red)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em" }}>Transport</div>
                  {emergency.transportOptions?.map((t,i) => (
                    <div key={i} style={{ fontSize:12.5, color:"var(--text-2)", padding:"6px 0", borderBottom:"1px solid var(--border)" }}>{t}</div>
                  ))}
                  <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
                    {emergency._full?.bookingLinks?.cabs && Object.entries(emergency._full.bookingLinks.cabs).slice(0,2).map(([k,v]) => (
                      <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost" style={{ textDecoration:"none", textTransform:"capitalize", fontSize:11 }}>{k}</a>
                    ))}
                    {emergency._full?.bookingLinks?.trains?.irctc && (
                      <a href={emergency._full.bookingLinks.trains.irctc} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost" style={{ textDecoration:"none", fontSize:11 }}>IRCTC</a>
                    )}
                  </div>
                  {emergency.emergencyContacts && (
                    <div style={{ marginTop:10, padding:"8px 10px", background:"var(--red-bg)", borderRadius:"var(--r-sm)", fontSize:11.5, color:"var(--red)" }}>
                      Police: {emergency.emergencyContacts.police} · Ambulance: {emergency.emergencyContacts.ambulance}
                    </div>
                  )}
                  {emergency._full?.replan?.daysReplanned > 0 && (
                    <div style={{ marginTop:8, padding:"6px 10px", background:"var(--amber-bg)", borderRadius:"var(--r-sm)", fontSize:11.5, color:"var(--amber)", fontWeight:600 }}>
                      ⚡ {emergency._full.replan.daysReplanned} day(s) auto-replanned with OSM venues
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Explainability panel */}
      <AnimatePresence>
        {explainOpen && (
          <ExplainPanel pipeline={plan?.pipeline} summary={plan?.summary} isOpen={explainOpen} onClose={()=>setExplain(false)} />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin360{to{transform:rotate(360deg)}}
        @keyframes agent-load{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}
      `}</style>
    </motion.div>
  );
}
