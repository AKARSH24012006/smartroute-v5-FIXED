/* ═══════════════════════════════════════════════════════
   useWeatherAlerts — Real-time weather alert polling
   Polls /api/live-alerts every 10 minutes.
   Returns structured alerts like "Rain at 4 PM".
   ═══════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from "react";

const POLL_INTERVAL = 10 * 60 * 1000; // 10 minutes

export default function useWeatherAlerts(destination, days = 5) {
  const [alerts, setAlerts]   = useState([]);
  const [weather, setWeather] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const fetch_ = useCallback(async () => {
    if (!destination?.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/live-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, days }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      if (data.ok) {
        setAlerts(data.alerts || []);
        setWeather(data.weather || []);
      }
    } catch {}
    finally { setLoading(false); }
  }, [destination, days]);

  useEffect(() => {
    fetch_();
    timerRef.current = setInterval(fetch_, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [fetch_]);

  return { alerts, weather, loading, refetch: fetch_ };
}
