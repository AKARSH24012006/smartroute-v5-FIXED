/* ═══════════════════════════════════════════════════════
   useLocation — Real-time location detection
   1. Browser Geolocation API (GPS, most accurate)
   2. Fallback: /api/location/detect → ipapi.co (IP-based)
   ═══════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from "react";

const DEFAULT_LOCATION = {
  city:    "Kattankulathur",
  region:  "Tamil Nadu",
  country: "India",
  lat:     12.8231,
  lon:     80.0444,
  source:  "default",
};

export default function useLocation() {
  const [location, setLocation]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [granted, setGranted]     = useState(false);

  /* Reverse geocode lat/lon → city name via Nominatim (free) */
  const reverseGeocode = useCallback(async (lat, lon) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        { headers: { "Accept-Language": "en" }, signal: AbortSignal.timeout(5000) }
      );
      const data = await res.json();
      const addr = data.address || {};
      return {
        city:    addr.city || addr.town || addr.village || addr.suburb || "Unknown",
        region:  addr.state || addr.county || "",
        country: addr.country || "India",
        lat,
        lon,
        source: "gps+nominatim",
      };
    } catch {
      return { city: "Your Location", region: "", country: "India", lat, lon, source: "gps" };
    }
  }, []);

  /* Try IP-based fallback via our server */
  const fetchIPLocation = useCallback(async () => {
    try {
      const res = await fetch("/api/location/detect", { signal: AbortSignal.timeout(6000) });
      const data = await res.json();
      if (data.ok) return data;
    } catch {}
    return DEFAULT_LOCATION;
  }, []);

  /* Detect location — GPS first, IP fallback */
  const detect = useCallback(() => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      // No GPS support — use IP
      fetchIPLocation().then(loc => {
        setLocation(loc);
        setLoading(false);
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGranted(true);
        const { latitude, longitude } = pos.coords;
        const loc = await reverseGeocode(latitude, longitude);
        setLocation(loc);
        setLoading(false);
      },
      async () => {
        // GPS denied/unavailable — fall back to IP
        const loc = await fetchIPLocation();
        setLocation(loc);
        setLoading(false);
        setError("GPS not available — using IP location.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, [fetchIPLocation, reverseGeocode]);

  /* Auto-detect on mount */
  useEffect(() => {
    detect();
  }, []);

  return { location, loading, error, granted, detect };
}
