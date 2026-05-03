/* MapExplorer — SRM mode + route drawing + nearby places */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SRM_PLACES, SRM_CATEGORIES } from "../data/srmdata.js";

const SRM_CENTER = [12.8231, 80.0444];
const COORDS = {
  shillong:[25.5788,91.8933], goa:[15.2993,74.124], ooty:[11.4102,76.695],
  munnar:[10.0889,77.0595], rishikesh:[30.0869,78.2676], jaipur:[26.9124,75.7873],
  delhi:[28.6139,77.209], mumbai:[19.076,72.8777], chennai:[13.0827,80.2707],
  bangalore:[12.9716,77.5946], hampi:[15.335,76.462], pondicherry:[11.9416,79.8083],
  varanasi:[25.3176,83.0064], kochi:[9.9312,76.2673], agra:[27.1767,78.0081],
  varkala:[8.7379,76.7163], "srm university":SRM_CENTER, srm:SRM_CENTER,
  kattankulathur:SRM_CENTER,
};
function getCoords(dest=""){
  const k=dest.toLowerCase().trim();
  for(const[c,v] of Object.entries(COORDS)) if(k.includes(c)||c.includes(k)) return v;
  return [20.5937,78.9629];
}

export default function MapExplorer({ tripCtx, addToast }) {
  const [dest, setDest]         = useState(tripCtx.destination||"Shillong");
  const [srmMode, setSrmMode]   = useState(false);
  const [srmCat, setSrmCat]     = useState("all");
  const [activities, setActs]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [hours, setHours]       = useState(4);
  const [gpsLoading, setGps]    = useState(false);
  const [selected, setSelected] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [userPos, setUserPos]   = useState(null);
  const mapRef  = useRef(null);
  const mapObj  = useRef(null);
  const layersRef = useRef({ markers:[], route:null, userMk:null });

  /* Sync with tripCtx */
  useEffect(()=>{
    if(tripCtx.destination && tripCtx.destination!==dest){
      setDest(tripCtx.destination);
      if(tripCtx.destination.toLowerCase().includes("srm")) activateSRM();
    }
  },[tripCtx.destination]); // eslint-disable-line

  /* Init Leaflet */
  useEffect(()=>{
    const el=mapRef.current;
    if(!el||mapObj.current) return;
    import("leaflet").then(mod=>{
      const L=mod.default||mod;
      if(!document.getElementById("lf-css")){
        const s=document.createElement("link");
        s.id="lf-css"; s.rel="stylesheet";
        s.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(s);
      }
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      const c=getCoords(dest);
      const map=L.map(el,{center:c,zoom:9,zoomControl:false,attributionControl:false});
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{maxZoom:19,subdomains:"abcd"}).addTo(map);
      if(!document.getElementById("sr-css")){
        const s=document.createElement("style"); s.id="sr-css";
        s.textContent=`@keyframes pulse-ring{0%{transform:scale(.8);opacity:.8}100%{transform:scale(2.2);opacity:0}}
        @keyframes spin360{to{transform:rotate(360deg)}}
        .sr-tip{background:#fff!important;border:1.5px solid #e5e7eb!important;border-radius:6px!important;
          font-size:11px!important;font-weight:600!important;color:#111!important;padding:3px 8px!important;
          box-shadow:0 2px 8px rgba(0,0,0,.1)!important;}`;
        document.head.appendChild(s);
      }
      mapObj.current=map;
    });
    return()=>{ if(mapObj.current){mapObj.current.remove();mapObj.current=null;} };
  },[]); // eslint-disable-line

  /* Fly to dest */
  useEffect(()=>{
    if(!mapObj.current||!dest) return;
    import("leaflet").then(mod=>{
      const L=mod.default||mod, map=mapObj.current;
      const c=getCoords(dest);
      map.eachLayer(l=>{ if(l._srDest) map.removeLayer(l); });
      const icon=L.divIcon({className:"",html:`<div style="width:12px;height:12px;border-radius:50%;background:#2563eb;border:2.5px solid white;box-shadow:0 2px 8px rgba(37,99,235,.5)"></div>`,iconSize:[12,12],iconAnchor:[6,6]});
      const m=L.marker(c,{icon}).bindTooltip(dest,{permanent:true,direction:"top",className:"sr-tip"}).addTo(map);
      m._srDest=true;
      map.flyTo(c, srmMode?14:9,{duration:1});
    });
  },[dest,srmMode]);

  /* Draw place markers */
  const drawMarkers = useCallback((places)=>{
    if(!mapObj.current) return;
    import("leaflet").then(mod=>{
      const L=mod.default||mod, map=mapObj.current;
      layersRef.current.markers.forEach(m=>map.removeLayer(m));
      layersRef.current.markers=[];
      const colors={food:"#f59e0b",academic:"#6366f1",landmark:"#6366f1",hospital:"#ef4444",medical:"#ef4444",sports:"#10b981",hostel:"#8b5cf6",transport:"#0891b2",banking:"#64748b",shop:"#ec4899",service:"#64748b"};
      places.forEach(p=>{
        const lat=p.lat||p.point?.lat||p.latitude;
        const lon=p.lon||p.point?.lon||p.longitude;
        if(!lat||!lon) return;
        const col=colors[p.type]||"#2563eb";
        const icon=L.divIcon({className:"",html:`<div style="width:28px;height:28px;border-radius:50%;background:${col};border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;font-size:13px">${p.emoji||"📍"}</div>`,iconSize:[28,28],iconAnchor:[14,14]});
        const popup=`<div style="font-family:system-ui;min-width:170px;padding:4px">
          ${p.imageUrl?`<img src="${p.imageUrl}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:6px"/>`:""} 
          <strong style="font-size:13px">${p.emoji||""} ${p.name}</strong><br/>
          <span style="font-size:11px;color:#6b7280">${p.description||p.kinds||""}</span><br/>
          ${p.timing?`<span style="font-size:11px">⏰ ${p.timing}</span><br/>`:""}
          ${p.priceRange?`<span style="font-size:11px">💰 ${p.priceRange}</span>`:""}
          ${p.mapUrl?`<br/><a href="${p.mapUrl}" target="_blank" style="font-size:11px;color:#2563eb;text-decoration:none;font-weight:600">Open in Google Maps →</a>`:""}
        </div>`;
        const mk=L.marker([lat,lon],{icon}).bindPopup(popup,{maxWidth:220}).addTo(map);
        mk.on("click",()=>{ setSelected(p.id||p.name); drawRoute(lat,lon,p); });
        layersRef.current.markers.push(mk);
      });
    });
  },[]);

  /* OSRM Route (free, no API key) */
  const drawRoute = useCallback(async(toLat,toLon,place)=>{
    if(!mapObj.current) return;
    let fromLat=userPos?.[0], fromLon=userPos?.[1];
    if(!fromLat){
      try{
        const pos=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{timeout:5000}));
        fromLat=pos.coords.latitude; fromLon=pos.coords.longitude;
        setUserPos([fromLat,fromLon]);
      } catch { fromLat=getCoords(dest)[0]; fromLon=getCoords(dest)[1]; }
    }
    const L=(await import("leaflet")).default, map=mapObj.current;
    if(layersRef.current.route) map.removeLayer(layersRef.current.route);
    // Draw user marker
    if(layersRef.current.userMk) map.removeLayer(layersRef.current.userMk);
    const uIcon=L.divIcon({className:"",html:`<div style="position:relative;width:18px;height:18px"><div style="position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,.2);animation:pulse-ring 1.5s ease-out infinite"></div><div style="position:absolute;inset:3px;border-radius:50%;background:#2563eb;border:2px solid white;box-shadow:0 2px 8px rgba(37,99,235,.6)"></div></div>`,iconSize:[18,18],iconAnchor:[9,9]});
    const uMk=L.marker([fromLat,fromLon],{icon:uIcon}).bindTooltip("You",{direction:"top",className:"sr-tip"}).addTo(map);
    layersRef.current.userMk=uMk;
    // Fetch OSRM route
    try{
      const url=`https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`;
      const data=await fetch(url).then(r=>r.json());
      const route=data.routes?.[0];
      if(route){
        const coords=route.geometry.coordinates.map(c=>[c[1],c[0]]);
        const poly=L.polyline(coords,{color:"#2563eb",weight:4,opacity:0.85,dashArray:null}).addTo(map);
        layersRef.current.route=poly;
        const dist=(route.distance/1000).toFixed(1);
        const mins=Math.round(route.duration/60);
        setRouteInfo({place:place.name,dist,mins});
        map.fitBounds(poly.getBounds(),{padding:[40,40]});
      }
    } catch { addToast("Routing unavailable","error"); }
  },[userPos,dest,addToast]);

  /* SRM mode */
  const activateSRM=useCallback(()=>{
    setSrmMode(true); setSrmCat("all");
    setDest("SRM University, Kattankulathur");
    setActs(SRM_PLACES);
    setTimeout(()=>drawMarkers(SRM_PLACES),400);
    addToast("SRM Campus mode — 30 places loaded","success");
  },[drawMarkers,addToast]);

  /* Fetch generic activities */
  const fetchActs=useCallback(async(d)=>{
    if(!d?.trim()) return;
    setLoading(true); setSrmMode(false);
    try{
      const r=await fetch("/api/activities/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({destination:d})});
      const data=await r.json();
      if(data.ok&&data.activities?.length){ setActs(data.activities.slice(0,8)); drawMarkers(data.activities.slice(0,8)); }
    } catch { addToast("Could not load activities","error"); }
    finally{ setLoading(false); }
  },[drawMarkers,addToast]);

  /* GPS locate */
  const locateUser=()=>{
    if(!navigator.geolocation){ addToast("GPS not available","error"); return; }
    setGps(true);
    navigator.geolocation.getCurrentPosition(async pos=>{
      const{latitude:lat,longitude:lon}=pos.coords;
      setUserPos([lat,lon]);
      if(!mapObj.current){setGps(false);return;}
      const L=(await import("leaflet")).default;
      if(layersRef.current.userMk) mapObj.current.removeLayer(layersRef.current.userMk);
      const icon=L.divIcon({className:"",html:`<div style="position:relative;width:18px;height:18px"><div style="position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,.2);animation:pulse-ring 1.5s ease-out infinite"></div><div style="position:absolute;inset:3px;border-radius:50%;background:#2563eb;border:2px solid white"></div></div>`,iconSize:[18,18],iconAnchor:[9,9]});
      const m=L.marker([lat,lon],{icon}).bindTooltip("You are here",{direction:"top",className:"sr-tip"}).addTo(mapObj.current);
      layersRef.current.userMk=m;
      mapObj.current.setView([lat,lon],13,{animate:true});
      addToast("Location found!","success");
      setGps(false);
    },()=>{addToast("Location denied","error");setGps(false);},{enableHighAccuracy:true,timeout:8000});
  };

  /* Filtered SRM places */
  const srmFiltered = srmMode
    ? (srmCat==="all" ? SRM_PLACES : SRM_PLACES.filter(p=>{
        const cat=SRM_CATEGORIES.find(c=>c.id===srmCat);
        return cat?.types.includes(p.type);
      }))
    : activities;

  return (
    <div>
      <div className="section-title">Map Explorer</div>
      <div className="section-sub">Interactive map with real-time directions — click any place to get a route</div>

      {/* SRM Quick Button */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <motion.button whileHover={{y:-1}} whileTap={{scale:.97}}
          onClick={activateSRM}
          style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",
            border:`1.5px solid ${srmMode?"#7c3aed":"var(--border)"}`,
            borderRadius:"var(--r-full)",background:srmMode?"rgba(124,58,237,.1)":"var(--bg-soft)",
            color:srmMode?"#7c3aed":"var(--text-2)",fontWeight:srmMode?700:500,
            fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
          🎓 SRM University Campus
          {srmMode && <span style={{background:"#7c3aed",color:"white",fontSize:10,padding:"1px 6px",borderRadius:99,fontWeight:700}}>{SRM_PLACES.length}</span>}
        </motion.button>
        <button onClick={()=>{setSrmMode(false);fetchActs(dest);}}
          style={{padding:"7px 14px",border:"1.5px solid var(--border)",borderRadius:"var(--r-full)",
            background:"var(--bg-soft)",color:"var(--text-2)",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
          Other Destinations
        </button>
      </div>

      <div className="map-explorer-layout">
        {/* Left panel */}
        <div className="map-explorer-panel">

          {/* Route info banner */}
          <AnimatePresence>
            {routeInfo && (
              <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                style={{background:"#eff6ff",border:"1.5px solid #bfdbfe",borderRadius:"var(--r-md)",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div>
                  <div style={{fontWeight:700,fontSize:13,color:"#1d4ed8"}}>🗺 Route to {routeInfo.place}</div>
                  <div style={{fontSize:12,color:"#3b82f6",marginTop:2}}>{routeInfo.dist} km · ~{routeInfo.mins} min drive</div>
                </div>
                <button onClick={()=>{setRouteInfo(null);if(layersRef.current.route&&mapObj.current){mapObj.current.removeLayer(layersRef.current.route);layersRef.current.route=null;}}}
                  style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#94a3b8"}}>×</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search */}
          {!srmMode && (
            <div className="card" style={{marginBottom:12}}>
              <div className="card-body" style={{display:"flex",flexDirection:"column",gap:8}}>
                <div className="field-group">
                  <label className="field-label">Destination</label>
                  <input className="field-input" value={dest} onChange={e=>setDest(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&fetchActs(dest)}
                    placeholder="e.g. Goa, Shillong, Chennai..." />
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button className="btn btn-primary" style={{flex:1}} onClick={()=>fetchActs(dest)} disabled={loading}>
                    {loading?"Searching...":"Find Nearby Places"}
                  </button>
                  <button className="btn btn-ghost" style={{width:42,padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}
                    onClick={locateUser} disabled={gpsLoading}>
                    {gpsLoading?<span style={{animation:"spin360 .8s linear infinite",display:"inline-block"}}>⟳</span>:"📍"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SRM category chips */}
          {srmMode && (
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
              {SRM_CATEGORIES.map(cat=>(
                <button key={cat.id} onClick={()=>setSrmCat(cat.id)}
                  style={{padding:"4px 12px",borderRadius:"var(--r-full)",fontSize:12,fontWeight:srmCat===cat.id?700:500,
                    border:`1.5px solid ${srmCat===cat.id?"#7c3aed":"var(--border)"}`,
                    background:srmCat===cat.id?"rgba(124,58,237,.1)":"var(--bg-soft)",
                    color:srmCat===cat.id?"#7c3aed":"var(--text-2)",cursor:"pointer",fontFamily:"inherit"}}>
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Places list */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">{srmMode?"SRM Campus Places":"Nearby Places"}</span>
              {srmFiltered.length>0 && <span className="pill green">{srmFiltered.length}</span>}
            </div>
            <div className="card-body" style={{display:"flex",flexDirection:"column",gap:8,maxHeight:440,overflowY:"auto"}}>
              {loading ? (
                <div style={{textAlign:"center",padding:20,color:"var(--text-3)",fontSize:13}}>
                  <span style={{animation:"spin360 1s linear infinite",display:"inline-block",marginRight:6}}>⟳</span>
                  Loading places...
                </div>
              ) : srmFiltered.length===0 ? (
                <div style={{textAlign:"center",padding:20,color:"var(--text-3)",fontSize:13}}>
                  {srmMode?"Click a category above":"Click \"Find Nearby Places\" to explore"}
                </div>
              ) : srmFiltered.map((p,i)=>(
                <motion.div key={p.id||i}
                  initial={{opacity:0,x:-4}} animate={{opacity:1,x:0}} transition={{delay:i*0.03}}
                  onClick={()=>{ const lat=p.lat||p.point?.lat; const lon=p.lon||p.point?.lon; if(lat&&lon&&mapObj.current){mapObj.current.flyTo([lat,lon],15,{duration:.7});} setSelected(p.id||p.name); drawRoute(lat,lon,p); }}
                  style={{display:"flex",alignItems:"center",gap:10,
                    background:selected===(p.id||p.name)?"white":"var(--bg-soft)",
                    border:`1.5px solid ${selected===(p.id||p.name)?"var(--blue-border)":"var(--border)"}`,
                    borderRadius:"var(--r-md)",padding:"9px 11px",cursor:"pointer",transition:"all .12s"}}>
                  {p.imageUrl?(
                    <img src={p.imageUrl} alt={p.name} style={{width:42,height:42,borderRadius:"var(--r-sm)",objectFit:"cover",flexShrink:0}} onError={e=>e.target.style.display="none"}/>
                  ):(
                    <div style={{width:42,height:42,borderRadius:"var(--r-sm)",background:"var(--bg-card)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{p.emoji||"📍"}</div>
                  )}
                  <div style={{minWidth:0,flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:"var(--text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
                    <div style={{fontSize:11.5,color:"var(--text-3)",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                      {p.timing||((p.kinds||"").split(",").slice(0,2).join(" · "))}
                      {p.priceRange&&` · ${p.priceRange}`}
                      {p.distance&&` · ${p.distance}`}
                    </div>
                  </div>
                  <div style={{fontSize:10,color:"var(--blue)",fontWeight:600,flexShrink:0}}>Route →</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Quick trip */}
          <div className="card" style={{marginTop:12}}>
            <div className="card-header"><span className="card-title">Quick Trip</span><span className="pill blue">{hours}h</span></div>
            <div className="card-body" style={{display:"flex",flexDirection:"column",gap:8}}>
              <input type="range" min={1} max={12} value={hours} onChange={e=>setHours(+e.target.value)} style={{width:"100%",accentColor:"var(--blue)"}}/>
              <div style={{fontSize:12,color:"var(--text-3)",textAlign:"center"}}>{hours} hours available</div>
              <button className="btn btn-ghost w-full" onClick={locateUser}>Use My GPS Location</button>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="map-explorer-main">
          <div className="live-badge"><span className="dot-live"/>LIVE MAP</div>
          {srmMode && (
            <div style={{position:"absolute",top:12,right:50,zIndex:800,background:"rgba(124,58,237,.95)",color:"white",fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:99,letterSpacing:".04em"}}>
              SRM CAMPUS
            </div>
          )}
          <div ref={mapRef} style={{width:"100%",height:"100%",minHeight:400}}/>
          <div className="map-controls">
            <button className="map-ctrl-btn" onClick={()=>mapObj.current?.zoomIn()}>+</button>
            <button className="map-ctrl-btn" onClick={()=>mapObj.current?.zoomOut()}>−</button>
          </div>
        </div>
      </div>
    </div>
  );
}
