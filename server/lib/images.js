/* ═══════════════════════════════════════════════════════
   SmartRoute — Real-Time Image Fetcher
   Priority: Unsplash API → Pexels API → Curated fallback
   No API key required for curated fallback.
   ═══════════════════════════════════════════════════════ */

/* Curated high-quality Unsplash images for Indian destinations */
const CURATED_IMAGES = {
  // Cities
  chennai:      "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&q=75",
  mumbai:       "https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?w=800&q=75",
  delhi:        "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&q=75",
  bangalore:    "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800&q=75",
  bengaluru:    "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800&q=75",
  kolkata:      "https://images.unsplash.com/photo-1558431382-27e303142255?w=800&q=75",
  hyderabad:    "https://images.unsplash.com/photo-1563115298-e9585e7943d4?w=800&q=75",
  pune:         "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800&q=75",
  ahmedabad:    "https://images.unsplash.com/photo-1609344028065-a7a5d70c0982?w=800&q=75",
  jaipur:       "https://images.unsplash.com/photo-1477587458883-47145ed31f4a?w=800&q=75",
  // Nature / Hill Stations
  shillong:     "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=75",
  goa:          "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&q=75",
  ooty:         "https://images.unsplash.com/photo-1603127567709-1faed89a0d38?w=800&q=75",
  munnar:       "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=75",
  manali:       "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=75",
  shimla:       "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&q=75",
  rishikesh:    "https://images.unsplash.com/photo-1544306094-e2dcf9e4abb9?w=800&q=75",
  darjeeling:   "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800&q=75",
  // Heritage / Culture
  hampi:        "https://images.unsplash.com/photo-1544036799-f68eba81e0f8?w=800&q=75",
  varanasi:     "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=800&q=75",
  agra:         "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&q=75",
  udaipur:      "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&q=75",
  jodhpur:      "https://images.unsplash.com/photo-1569585723035-0e9e638f5ea1?w=800&q=75",
  jaisalmer:    "https://images.unsplash.com/photo-1598427303058-2bb0b648b7eb?w=800&q=75",
  // Coastal
  kochi:        "https://images.unsplash.com/photo-1590159983013-d4de8c2b5e99?w=800&q=75",
  pondicherry:  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=75",
  varkala:      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=75",
  // Default
  india:        "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&q=75",
};

/* Category-based fallbacks */
const CATEGORY_IMAGES = {
  hotel:       "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=75",
  restaurant:  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=75",
  attraction:  "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=75",
  beach:       "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=75",
  mountain:    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=75",
  temple:      "https://images.unsplash.com/photo-1548013146-72479768bada?w=600&q=75",
  fort:        "https://images.unsplash.com/photo-1598438432905-76df7d3e1df3?w=600&q=75",
  food:        "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=75",
};

/**
 * Get a curated fallback image URL for a destination or category.
 * @param {string} query
 * @param {string} [category]
 * @returns {string}
 */
function getCuratedImage(query = "", category = "") {
  const q = query.toLowerCase();
  // Try destination match
  for (const [key, url] of Object.entries(CURATED_IMAGES)) {
    if (q.includes(key)) return url;
  }
  // Try category match
  if (category) {
    const catKey = category.toLowerCase();
    for (const [key, url] of Object.entries(CATEGORY_IMAGES)) {
      if (catKey.includes(key)) return url;
    }
  }
  return CURATED_IMAGES.india;
}

/**
 * Fetch images from Unsplash API.
 * Requires UNSPLASH_ACCESS_KEY env variable.
 */
async function fetchUnsplashImages(query, count = 4) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${key}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.results?.map(p => ({
    url:      p.urls.regular,
    thumb:    p.urls.small,
    alt:      p.alt_description || query,
    credit:   p.user.name,
    creditUrl: p.user.links.html,
    source:   "unsplash",
  })) || null;
}

/**
 * Fetch images from Pexels API.
 * Requires PEXELS_API_KEY env variable.
 */
async function fetchPexelsImages(query, count = 4) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;

  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`;
  const res = await fetch(url, {
    headers: { Authorization: key },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.photos?.map(p => ({
    url:      p.src.large,
    thumb:    p.src.medium,
    alt:      p.alt || query,
    credit:   p.photographer,
    creditUrl: p.photographer_url,
    source:   "pexels",
  })) || null;
}

/**
 * Main image search function — tries Unsplash → Pexels → curated fallback.
 * @param {string} query  e.g. "Shillong", "hotel", "Munnar hills"
 * @param {string} [category]  e.g. "hotel", "restaurant", "attraction"
 * @param {number} [count]
 */
export async function searchImages(query, category = "", count = 4) {
  // 1. Try Unsplash
  try {
    const unsplash = await fetchUnsplashImages(query, count);
    if (unsplash?.length) return { images: unsplash, source: "unsplash" };
  } catch {}

  // 2. Try Pexels
  try {
    const pexels = await fetchPexelsImages(query, count);
    if (pexels?.length) return { images: pexels, source: "pexels" };
  } catch {}

  // 3. Curated fallback — always works, no API key needed
  const fallbackUrl = getCuratedImage(query, category);
  return {
    images: [{ url: fallbackUrl, thumb: fallbackUrl, alt: query, source: "curated" }],
    source: "curated",
  };
}

/**
 * Get a single hero image for a destination.
 */
export async function getDestinationHeroImage(destination) {
  const result = await searchImages(destination, "travel", 1);
  return result.images[0]?.url || CURATED_IMAGES.india;
}

export { getCuratedImage, CURATED_IMAGES, CATEGORY_IMAGES };
