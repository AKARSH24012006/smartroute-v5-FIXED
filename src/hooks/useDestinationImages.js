/* ═══════════════════════════════════════════════════════
   useDestinationImages — Dynamic image fetching
   Fetches real images from /api/images/search
   with in-memory cache to avoid re-fetching.
   ═══════════════════════════════════════════════════════ */

import { useState, useEffect, useRef } from "react";

const memCache = new Map();

export default function useDestinationImages(query, category = "", count = 1) {
  const [images, setImages]   = useState([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!query?.trim()) return;

    const cacheKey = `${query}:${category}:${count}`;
    if (memCache.has(cacheKey)) {
      setImages(memCache.get(cacheKey));
      return;
    }

    // Cancel previous request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    fetch("/api/images/search", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ query, category, count }),
      signal:  abortRef.current.signal,
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.images?.length) {
          memCache.set(cacheKey, data.images);
          setImages(data.images);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => abortRef.current?.abort();
  }, [query, category, count]);

  const primaryUrl = images[0]?.url || null;
  return { images, primaryUrl, loading };
}
