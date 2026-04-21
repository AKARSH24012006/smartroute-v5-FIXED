/* ── API utilities for Smart Route backend ── */

/* Fallback geocode dictionary for common Indian cities */
const KNOWN_COORDS = {
  shillong: { name: "Shillong", country: "India", latitude: 25.5788, longitude: 91.8933 },
  goa: { name: "Goa", country: "India", latitude: 15.2993, longitude: 74.124 },
  ooty: { name: "Ooty", country: "India", latitude: 11.4102, longitude: 76.695 },
  munnar: { name: "Munnar", country: "India", latitude: 10.0889, longitude: 77.0595 },
  rishikesh: { name: "Rishikesh", country: "India", latitude: 30.0869, longitude: 78.2676 },
  udaipur: { name: "Udaipur", country: "India", latitude: 24.5854, longitude: 73.7125 },
  jaipur: { name: "Jaipur", country: "India", latitude: 26.9124, longitude: 75.7873 },
  delhi: { name: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209 },
  mumbai: { name: "Mumbai", country: "India", latitude: 19.076, longitude: 72.8777 },
  chennai: { name: "Chennai", country: "India", latitude: 13.0827, longitude: 80.2707 },
  bangalore: { name: "Bangalore", country: "India", latitude: 12.9716, longitude: 77.5946 },
  kolkata: { name: "Kolkata", country: "India", latitude: 22.5726, longitude: 88.3639 },
  hyderabad: { name: "Hyderabad", country: "India", latitude: 17.385, longitude: 78.4867 },
  varanasi: { name: "Varanasi", country: "India", latitude: 25.3176, longitude: 83.0064 },
  manali: { name: "Manali", country: "India", latitude: 32.2396, longitude: 77.1887 },
  shimla: { name: "Shimla", country: "India", latitude: 31.1048, longitude: 77.1734 },
  darjeeling: { name: "Darjeeling", country: "India", latitude: 27.041, longitude: 88.2663 },
  agra: { name: "Agra", country: "India", latitude: 27.1767, longitude: 78.0081 },
  kochi: { name: "Kochi", country: "India", latitude: 9.9312, longitude: 76.2673 },
  pondicherry: { name: "Pondicherry", country: "India", latitude: 11.9416, longitude: 79.8083 }
};

export async function geocodePlace(name) {
  if (!name) return null;

  // Check fallback dictionary first
  const normalized = String(name).trim().toLowerCase();
  for (const [key, coords] of Object.entries(KNOWN_COORDS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return { ...coords };
    }
  }

  try {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", name);
    url.searchParams.set("count", "3");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const first = data.results?.[0];
    if (!first) return null;

    return {
      name: first.name,
      country: first.country,
      latitude: first.latitude,
      longitude: first.longitude
    };
  } catch {
    return null;
  }
}

export async function fetchWeather(latitude, longitude, days = 5) {
  if (typeof latitude !== "number" || typeof longitude !== "number") return [];
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", String(Math.min(days, 7)));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Forecast failed with ${response.status}`);
  }

  const data = await response.json();
  const daily = data.daily;
  if (!daily) return [];

  return daily.time.map((date, index) => ({
    date,
    label: `Day ${index + 1}`,
    weatherCode: daily.weather_code[index],
    max: Math.round(daily.temperature_2m_max[index]),
    min: Math.round(daily.temperature_2m_min[index]),
    precipitation: daily.precipitation_probability_max?.[index] || 0,
    windSpeed: daily.wind_speed_10m_max?.[index] || 0
  }));
}

export function weatherEmoji(code) {
  if ([0].includes(code)) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if ([3].includes(code)) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌥️";
}

/* ── OpenTripMap: real attractions/activities around a location ── */
export async function fetchActivities(latitude, longitude, radius = 5000, limit = 20) {
  try {
    const url = `https://api.opentripmap.com/0.1/en/places/radius?radius=${radius}&lon=${longitude}&lat=${latitude}&kinds=interesting_places,cultural,natural,sport,amusements,foods&format=json&limit=${limit}&apikey=5ae2e3f221c38a28845f05b6afd40e0e1481e8a3542e4c33a0443070`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data
      .filter(place => place.name && place.name.trim())
      .map(place => ({
        id: place.xid,
        name: place.name,
        kinds: place.kinds?.split(",").slice(0, 3).join(", ") || "attraction",
        distance: place.dist ? `${(place.dist / 1000).toFixed(1)} km` : "nearby",
        latitude: place.point?.lat,
        longitude: place.point?.lon,
        rating: place.rate || 0
      }));
  } catch {
    return [];
  }
}

/* ── Booking URL generators ── */
export function generateFlightBookingUrl(origin, destination, date) {
  const params = new URLSearchParams();
  if (origin) params.set("q", `flights from ${origin} to ${destination}`);
  if (date) params.set("date", date);
  return `https://www.google.com/travel/flights?q=flights+from+${encodeURIComponent(origin || "")}+to+${encodeURIComponent(destination || "")}`;
}

export function generateHotelBookingUrl(city, checkIn, checkOut) {
  return `https://www.google.com/travel/hotels/${encodeURIComponent(city || "")}?q=hotels+in+${encodeURIComponent(city || "")}&dates=${checkIn || ""}+to+${checkOut || ""}`;
}

/* ── Realistic flight data generator ── */
export function generateRealisticFlights(origin, destination, date, passengers = 1) {
  const airlines = [
    { name: "IndiGo", code: "6E", color: "#003580" },
    { name: "Air India", code: "AI", color: "#DC143C" },
    { name: "Vistara", code: "UK", color: "#7B2D8E" },
    { name: "SpiceJet", code: "SG", color: "#FF6F00" },
    { name: "Go First", code: "G8", color: "#2E7D32" },
    { name: "AirAsia India", code: "I5", color: "#FE2C54" }
  ];

  const departureTimes = ["05:30", "06:45", "08:15", "10:30", "12:45", "14:20", "16:55", "18:30", "20:15", "22:00"];
  const durations = ["1h 45m", "2h 05m", "2h 15m", "2h 35m", "2h 50m", "3h 10m", "3h 30m", "4h 15m"];
  const basePrices = [3200, 3800, 4200, 4600, 5100, 5500, 5900, 6400, 7200, 7800];

  const count = Math.min(6, airlines.length);
  const bookingUrl = generateFlightBookingUrl(origin, destination, date);

  return Array.from({ length: count }, (_, i) => {
    const airline = airlines[i % airlines.length];
    const depTime = departureTimes[i % departureTimes.length];
    const duration = durations[i % durations.length];
    const basePrice = basePrices[i % basePrices.length] + Math.round(Math.random() * 800 - 400);
    const totalPrice = basePrice * (passengers || 1);

    // Calculate arrival time
    const [dH, dM] = depTime.split(":").map(Number);
    const durMatch = duration.match(/(\d+)h\s*(\d+)m/);
    const durH = Number(durMatch?.[1] || 2);
    const durM = Number(durMatch?.[2] || 15);
    let arrH = dH + durH;
    let arrM = dM + durM;
    if (arrM >= 60) { arrH += 1; arrM -= 60; }
    arrH = arrH % 24;
    const arrTime = `${String(arrH).padStart(2, "0")}:${String(arrM).padStart(2, "0")}`;

    return {
      airline: airline.name,
      airlineCode: airline.code,
      flightNo: `${airline.code}-${100 + Math.round(Math.random() * 900)}`,
      origin: origin || "DEL",
      destination: destination || "BLR",
      departureTime: depTime,
      arrivalTime: arrTime,
      duration,
      stops: i < 3 ? "Non-stop" : "1 stop",
      price: totalPrice,
      priceFormatted: `₹${totalPrice.toLocaleString("en-IN")}`,
      perPerson: `₹${basePrice.toLocaleString("en-IN")}`,
      class: "Economy",
      bookingUrl,
      refundable: i % 3 === 0
    };
  }).sort((a, b) => a.price - b.price);
}

/* ── Realistic hotel data generator ── */
export function generateRealisticHotels(city, budget) {
  const chains = [
    { name: "OYO Rooms", prefix: "OYO", stars: 3, base: 1200 },
    { name: "Treebo Trend", prefix: "Treebo", stars: 3.5, base: 1800 },
    { name: "FabHotel", prefix: "FabHotel", stars: 3, base: 1400 },
    { name: "Lemon Tree Hotels", prefix: "Lemon Tree", stars: 4, base: 3200 },
    { name: "ITC Hotels", prefix: "ITC", stars: 5, base: 6500 },
    { name: "Taj Hotels", prefix: "Taj", stars: 5, base: 8000 },
    { name: "The Oberoi", prefix: "Oberoi", stars: 5, base: 9500 },
    { name: "Radisson Blu", prefix: "Radisson", stars: 4.5, base: 4800 },
    { name: "Holiday Inn", prefix: "Holiday Inn", stars: 4, base: 3800 },
    { name: "ibis", prefix: "ibis", stars: 3, base: 2200 }
  ];

  const amenitiesPool = ["Free WiFi", "Breakfast", "Pool", "Gym", "Spa", "Parking", "AC", "Room Service", "Restaurant", "Bar"];
  const bookingUrl = generateHotelBookingUrl(city);

  return chains
    .filter(h => h.base <= (budget || 15000) * 0.5)
    .slice(0, 8)
    .map((hotel, i) => {
      const priceVar = Math.round(hotel.base * (0.8 + Math.random() * 0.4));
      const amenityCount = Math.min(4, Math.ceil(hotel.stars));
      const amenities = amenitiesPool.slice(0, amenityCount + (i % 2));
      const distance = (0.5 + Math.random() * 5).toFixed(1);
      const reviewCount = Math.round(200 + Math.random() * 3000);

      return {
        name: `${hotel.prefix} ${city}`,
        chain: hotel.name,
        stars: hotel.stars,
        rating: (3.5 + Math.random() * 1.4).toFixed(1),
        reviewCount,
        pricePerNight: priceVar,
        priceFormatted: `₹${priceVar.toLocaleString("en-IN")}`,
        amenities,
        distanceFromCenter: `${distance} km`,
        bookingUrl,
        cancellationPolicy: i % 3 === 0 ? "Free cancellation" : "Non-refundable"
      };
    })
    .sort((a, b) => a.pricePerNight - b.pricePerNight);
}
