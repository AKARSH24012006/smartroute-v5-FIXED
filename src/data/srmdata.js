/* ═══════════════════════════════════════════════════════
   SmartRoute — SRM Kattankulathur Campus Intelligence
   30 places with real images, coordinates, details
   ═══════════════════════════════════════════════════════ */

/* Real SRM University campus photos (served from /public/srm/) */
const IMG = {
  cafe:      "/srm/cafe.png",        // Slice of Life — colorful chairs
  canteen:   "/srm/canteen.png",     // Java Canteen — red chairs, ceiling fans
  food:      "/srm/canteen.png",     // Generic food — same canteen style
  juice:     "/srm/canteen.png",     // Juice Corner — canteen area
  bakery:    "/srm/canteen.png",     // Bakery — canteen vicinity
  techpark:  "/srm/techpark.png",    // Tech Park — glass office building
  library:   "/srm/library.png",     // UB Library — bookshelves & study tables
  auditorium:"/srm/auditorium.png",  // Aaruush Auditorium — yellow/black building
  admin:     "/srm/techpark.png",    // Admin Block — main building style
  labs:      "/srm/campus.png",      // Engineering labs — campus aerial
  hospital:  "/srm/hospital.png",    // SRM Global Hospital — actual hospital
  pharmacy:  "/srm/hospital.png",    // Campus Pharmacy — hospital area
  dental:    "/srm/hospital.png",    // Dental College — medical campus
  stadium:   "/srm/stadium.png",     // Sports Ground — cricket/football field
  basketball:"/srm/stadium.png",     // Basketball courts — sports area
  gym:       "/srm/gym.png",         // Gym — fitness center interior
  badminton: "/srm/gym.png",         // Badminton — sports facility
  pool:      "/srm/stadium.png",     // Swimming Pool — sports complex
  atm:       "/srm/campus.png",      // ATM — campus area
  hostel:    "/srm/hostel.png",      // Hostel block — residential building
  bus:       "/srm/bus.png",         // Bus Terminal — SRM buses
  auto:      "/srm/bus.png",         // Auto Stand — transport area
  shop:      "/srm/cafe.png",        // Bookshop — campus shop area
  laundry:   "/srm/hostel.png",      // Laundry — hostel services
  print:     "/srm/library.png",     // Print Centre — near library
  research:  "/srm/techpark.png",    // Research Park — tech building
};


export const SRM_PLACES = [
  /* ─── Food & Cafeterias ─── */
  {
    id:"s1", name:"Java Canteen", shortName:"Java", type:"food", emoji:"☕",
    lat:12.8231, lon:80.0444,
    description:"Main canteen near Tech Park — hot South Indian meals, filter coffee, teas and snacks all day. Famous for its affordable thali.", 
    rating:4.2, timing:"7 AM – 9 PM", priceRange:"₹40–120", tags:["canteen","coffee","snacks","meals","thali"],
    imageUrl: IMG.cafe,
    mapUrl: "https://maps.google.com/?q=Java+Canteen+SRM+University+Kattankulathur",
  },
  {
    id:"s2", name:"Slice of Life", shortName:"Slice", type:"food", emoji:"🍕",
    lat:12.8225, lon:80.0447,
    description:"Most popular café on campus — great coffee, sandwiches, pasta and desserts. Students' favourite hangout spot.",
    rating:4.5, timing:"8 AM – 10 PM", priceRange:"₹80–250", tags:["cafe","coffee","pasta","pizza","hangout"],
    imageUrl: IMG.cafe,
    mapUrl: "https://maps.google.com/?q=Slice+of+Life+SRM+University",
  },
  {
    id:"s3", name:"Juice Corner", shortName:"Juice", type:"food", emoji:"🧃",
    lat:12.8229, lon:80.0450,
    description:"Fresh fruit juices, milkshakes and energy drinks — perfect during Chennai's summer heat.",
    rating:4.1, timing:"8 AM – 8 PM", priceRange:"₹30–80", tags:["juice","milkshake","drinks"],
    imageUrl: IMG.juice,
    mapUrl: "https://maps.google.com/?q=SRM+University+Juice+Corner",
  },
  {
    id:"s4", name:"Food Court (Block A)", shortName:"Food Court", type:"food", emoji:"🍱",
    lat:12.8233, lon:80.0442,
    description:"Multi-vendor food court — South Indian breakfast, Chinese, North Indian and Continental options under one roof.",
    rating:4.0, timing:"7 AM – 9 PM", priceRange:"₹50–150", tags:["food court","south indian","chinese","north indian"],
    imageUrl: IMG.food,
    mapUrl: "https://maps.google.com/?q=SRM+Food+Court+Kattankulathur",
  },
  {
    id:"s5", name:"Midnight Canteen", shortName:"Midnight", type:"food", emoji:"🌙",
    lat:12.8228, lon:80.0445,
    description:"Late-night canteen for hostel students — Maggi, omelettes, chai and quick bites after 10 PM.",
    rating:4.3, timing:"10 PM – 2 AM", priceRange:"₹20–80", tags:["late night","hostel","chai","maggi"],
    imageUrl: IMG.canteen,
    mapUrl: "https://maps.google.com/?q=SRM+Midnight+Canteen",
  },
  {
    id:"s6", name:"Meenakshi Bakery & Sweets", shortName:"Meenakshi", type:"food", emoji:"🥐",
    lat:12.8226, lon:80.0443,
    description:"Popular bakery near the main gate with fresh bread, cakes, murukku, sweets and Tamil-style snacks.",
    rating:4.0, timing:"8 AM – 7 PM", priceRange:"₹20–200", tags:["bakery","sweets","cake","snacks","meenakshi"],
    imageUrl: IMG.bakery,
    mapUrl: "https://maps.google.com/?q=Meenakshi+Bakery+SRM+University",
  },

  /* ─── Academic & Key Buildings ─── */
  {
    id:"s7", name:"Tech Park (TP)", shortName:"Tech Park", type:"landmark", emoji:"🏢",
    lat:12.8228, lon:80.0440,
    description:"SRM's flagship innovation hub — hosts startup incubation, coding labs, robotics workshops and tech company offices. Iconic glass building.",
    rating:4.6, timing:"9 AM – 6 PM", priceRange:"Free", tags:["tech park","tp","innovation","startup","labs","engineering"],
    imageUrl: IMG.techpark,
    mapUrl: "https://maps.google.com/?q=SRM+Tech+Park+Kattankulathur",
  },
  {
    id:"s8", name:"University Library (UB)", shortName:"Library / UB", type:"academic", emoji:"📚",
    lat:12.8232, lon:80.0441,
    description:"Central UB Library with 2+ lakh books, digital journals, silent study zones and group study rooms. 24-hr access during exams.",
    rating:4.4, timing:"8 AM – 9 PM (exam: 24hr)", priceRange:"Free", tags:["library","ub","books","study","research"],
    imageUrl: IMG.library,
    mapUrl: "https://maps.google.com/?q=SRM+University+Library+Kattankulathur",
  },
  {
    id:"s9", name:"Main Auditorium", shortName:"Auditorium", type:"landmark", emoji:"🎭",
    lat:12.8230, lon:80.0438,
    description:"2000-seat air-conditioned auditorium for SRM convocations, cultural events (Aaruush), guest lectures and fests.",
    rating:4.5, timing:"Event days only", priceRange:"Free", tags:["auditorium","aaruush","events","culture","fest"],
    imageUrl: IMG.auditorium,
    mapUrl: "https://maps.google.com/?q=SRM+University+Auditorium",
  },
  {
    id:"s10", name:"Admin Block", shortName:"Admin", type:"academic", emoji:"🏛",
    lat:12.8234, lon:80.0439,
    description:"Main administrative block — Registrar, Admissions, Finance, Exam Cell and Controller of Examinations offices.",
    rating:3.8, timing:"9 AM – 5 PM (Mon–Sat)", priceRange:"Free", tags:["admin","registrar","admissions","exam cell"],
    imageUrl: IMG.admin,
    mapUrl: "https://maps.google.com/?q=SRM+Admin+Block+Kattankulathur",
  },
  {
    id:"s11", name:"Engineering Block (EB)", shortName:"Eng Block", type:"academic", emoji:"⚙️",
    lat:12.8227, lon:80.0435,
    description:"Main engineering block — CSE, IT, ECE, EEE departments. Houses smart classrooms, VLSI labs, data centre and faculty offices.",
    rating:4.2, timing:"8 AM – 6 PM", priceRange:"Free", tags:["engineering","cse","it","ece","eee","labs"],
    imageUrl: IMG.labs,
    mapUrl: "https://maps.google.com/?q=SRM+Engineering+Block+Kattankulathur",
  },
  {
    id:"s12", name:"SRM Research Park", shortName:"Research", type:"academic", emoji:"🔬",
    lat:12.8222, lon:80.0441,
    description:"Dedicated research facility for PhD scholars and SERB projects — biotech labs, nanotech, AI research centre.",
    rating:4.5, timing:"9 AM – 6 PM", priceRange:"By permit", tags:["research","phd","labs","science","biotech"],
    imageUrl: IMG.research,
    mapUrl: "https://maps.google.com/?q=SRM+Research+Park+Kattankulathur",
  },

  /* ─── Medical & Health ─── */
  {
    id:"s13", name:"SRM Global Hospital", shortName:"SRM Hospital", type:"hospital", emoji:"🏥",
    lat:12.8215, lon:80.0451,
    description:"SRM's multi-specialty teaching hospital — 24/7 emergency, OPD, ICU, surgical suites and specialist doctors for students & staff.",
    rating:4.3, timing:"24/7 Emergency · OPD: 9 AM–5 PM", priceRange:"OPD: ₹50–200", tags:["hospital","emergency","medical","srm global","health","doctor"],
    imageUrl: IMG.hospital,
    mapUrl: "https://maps.google.com/?q=SRM+Global+Hospital+Kattankulathur",
  },
  {
    id:"s14", name:"Campus Pharmacy", shortName:"Pharmacy", type:"medical", emoji:"💊",
    lat:12.8218, lon:80.0449,
    description:"Medical store inside campus with prescription medicines, OTC drugs, basic first aid and health supplements.",
    rating:4.2, timing:"8 AM – 10 PM", priceRange:"Varies", tags:["pharmacy","medicine","medical","drugs"],
    imageUrl: IMG.pharmacy,
    mapUrl: "https://maps.google.com/?q=SRM+Campus+Pharmacy",
  },
  {
    id:"s15", name:"SRM Dental College", shortName:"Dental", type:"medical", emoji:"🦷",
    lat:12.8220, lon:80.0453,
    description:"Dental college and OPD hospital — fillings, braces, scaling and oral surgery at student-subsidised rates.",
    rating:4.3, timing:"9 AM – 5 PM (Mon–Sat)", priceRange:"₹100–500", tags:["dental","teeth","oral","health","dentist"],
    imageUrl: IMG.dental,
    mapUrl: "https://maps.google.com/?q=SRM+Dental+College+Kattankulathur",
  },

  /* ─── Sports & Recreation ─── */
  {
    id:"s16", name:"Dental Ground Stadium", shortName:"Stadium", type:"sports", emoji:"🏟",
    lat:12.8220, lon:80.0455,
    description:"Multi-purpose sports stadium used for cricket, football, athletics. Hosts SRM inter-college sports events (Sportomania).",
    rating:4.4, timing:"6 AM – 8 PM", priceRange:"Free", tags:["stadium","cricket","football","sportomania","athletics"],
    imageUrl: IMG.stadium,
    mapUrl: "https://maps.google.com/?q=SRM+Dental+Ground+Stadium",
  },
  {
    id:"s17", name:"Basketball Courts", shortName:"Basketball", type:"sports", emoji:"🏀",
    lat:12.8223, lon:80.0456,
    description:"Outdoor basketball courts open to all students — popular in evenings for casual games and inter-dept matches.",
    rating:4.1, timing:"6 AM – 9 PM", priceRange:"Free", tags:["basketball","sports","court","outdoor"],
    imageUrl: IMG.basketball,
    mapUrl: "https://maps.google.com/?q=SRM+Basketball+Court",
  },
  {
    id:"s18", name:"SRM Gym & Fitness Centre", shortName:"Gym", type:"sports", emoji:"💪",
    lat:12.8226, lon:80.0458,
    description:"Well-equipped gym with modern cardio machines, free weights, and personal training. Separate zones for men and women.",
    rating:4.2, timing:"5 AM – 9 PM", priceRange:"₹500/month", tags:["gym","fitness","workout","exercise"],
    imageUrl: IMG.gym,
    mapUrl: "https://maps.google.com/?q=SRM+Gym+Kattankulathur",
  },
  {
    id:"s19", name:"Indoor Badminton Courts", shortName:"Badminton", type:"sports", emoji:"🏸",
    lat:12.8219, lon:80.0457,
    description:"3 indoor badminton courts — book in advance at sports office. Rackets available on rental.",
    rating:4.3, timing:"6 AM – 10 PM", priceRange:"₹50/hr", tags:["badminton","sports","indoor","court"],
    imageUrl: IMG.badminton,
    mapUrl: "https://maps.google.com/?q=SRM+Badminton+Courts",
  },
  {
    id:"s20", name:"Swimming Pool", shortName:"Pool", type:"sports", emoji:"🏊",
    lat:12.8217, lon:80.0459,
    description:"Olympic-size swimming pool — coaching available, separate timings for men/women and competitive training.",
    rating:4.4, timing:"6 AM – 8 PM", priceRange:"₹200/month", tags:["swimming","pool","sports","coaching"],
    imageUrl: IMG.pool,
    mapUrl: "https://maps.google.com/?q=SRM+Swimming+Pool",
  },

  /* ─── Banking & ATM ─── */
  {
    id:"s21", name:"SBI ATM (Campus)", shortName:"SBI ATM", type:"banking", emoji:"🏧",
    lat:12.8230, lon:80.0461,
    description:"State Bank of India ATM inside campus — 24/7, near main gate. Supports all debit/credit cards.",
    rating:4.0, timing:"24/7", priceRange:"Free", tags:["atm","sbi","bank","cash"],
    imageUrl: IMG.atm,
    mapUrl: "https://maps.google.com/?q=SBI+ATM+SRM+University",
  },
  {
    id:"s22", name:"Canara Bank ATM", shortName:"Canara ATM", type:"banking", emoji:"🏧",
    lat:12.8227, lon:80.0462,
    description:"Canara Bank ATM near hostel block — convenient for hostel students, usually queue-free.",
    rating:3.9, timing:"24/7", priceRange:"Free", tags:["atm","canara","bank","cash"],
    imageUrl: IMG.atm,
    mapUrl: "https://maps.google.com/?q=Canara+Bank+ATM+SRM+Kattankulathur",
  },

  /* ─── Hostels ─── */
  {
    id:"s23", name:"Men's Hostel (Cauvery Block)", shortName:"Men's Hostel", type:"hostel", emoji:"🏠",
    lat:12.8212, lon:80.0448,
    description:"Main men's hostel — single and double AC/non-AC rooms, daily mess, Wi-Fi, common room with TV. Curfew: 10 PM.",
    rating:3.9, timing:"24/7 (Curfew: 10 PM)", priceRange:"₹80K–1.2L/year", tags:["hostel","men","accommodation","room","mess","cauvery"],
    imageUrl: IMG.hostel,
    mapUrl: "https://maps.google.com/?q=SRM+Mens+Hostel+Kattankulathur",
  },
  {
    id:"s24", name:"Women's Hostel (Savitri Block)", shortName:"Women's Hostel", type:"hostel", emoji:"🏠",
    lat:12.8214, lon:80.0446,
    description:"Women's hostel — 24/7 CCTV security, biometric access, Wi-Fi, mess with vegetarian + non-veg options.",
    rating:4.0, timing:"24/7 (Curfew: 9 PM)", priceRange:"₹80K–1.2L/year", tags:["hostel","women","accommodation","savitri","mess"],
    imageUrl: IMG.hostel,
    mapUrl: "https://maps.google.com/?q=SRM+Womens+Hostel+Kattankulathur",
  },

  /* ─── Transport ─── */
  {
    id:"s25", name:"SRM Bus Terminal", shortName:"Bus Stand", type:"transport", emoji:"🚌",
    lat:12.8235, lon:80.0463,
    description:"Campus bus terminal — SRMIST buses to Tambaram station, Chengalpattu, Porur, Chrompet and Chennai Central.",
    rating:4.1, timing:"6 AM – 9 PM", priceRange:"₹300–800/month", tags:["bus","transport","tambaram","chennai","chengalpattu"],
    imageUrl: IMG.bus,
    mapUrl: "https://maps.google.com/?q=SRM+Bus+Stand+Kattankulathur",
  },
  {
    id:"s26", name:"Auto & Cab Stand (Main Gate)", shortName:"Auto Stand", type:"transport", emoji:"🛺",
    lat:12.8236, lon:80.0464,
    description:"Shared autos to Guduvanchery station (₹20), Ola/Uber/Rapido pickup point at SRM main gate.",
    rating:3.8, timing:"6 AM – 10 PM", priceRange:"₹20–150", tags:["auto","cab","ola","uber","rapido","taxi","transport"],
    imageUrl: IMG.auto,
    mapUrl: "https://maps.google.com/?q=SRM+Main+Gate+Kattankulathur",
  },

  /* ─── Shops & Services ─── */
  {
    id:"s27", name:"SRM Stationery & Bookshop", shortName:"Stationery", type:"shop", emoji:"📖",
    lat:12.8229, lon:80.0443,
    description:"Campus bookshop — textbooks, stationery, lab record books, printing and xerox services. Cheapest printing on campus.",
    rating:4.0, timing:"9 AM – 7 PM", priceRange:"₹1–500", tags:["stationery","books","printing","shop","xerox"],
    imageUrl: IMG.shop,
    mapUrl: "https://maps.google.com/?q=SRM+Stationery+Bookshop",
  },
  {
    id:"s28", name:"Laundry Service", shortName:"Laundry", type:"service", emoji:"👕",
    lat:12.8213, lon:80.0450,
    description:"Laundry and dry-cleaning service for hostel students — per-kg pricing, 24-hr turnaround.",
    rating:3.9, timing:"8 AM – 8 PM", priceRange:"₹20–100/kg", tags:["laundry","washing","dry cleaning","service"],
    imageUrl: IMG.laundry,
    mapUrl: "https://maps.google.com/?q=SRM+Laundry+Service",
  },
  {
    id:"s29", name:"Photocopy & Printing Centre", shortName:"Printout", type:"service", emoji:"🖨️",
    lat:12.8231, lon:80.0442,
    description:"Cheapest photocopy (₹1/page), colour printing, spiral binding, ID card lamination and report printing.",
    rating:4.1, timing:"8 AM – 9 PM", priceRange:"₹1–10/page", tags:["printing","photocopy","binding","service"],
    imageUrl: IMG.print,
    mapUrl: "https://maps.google.com/?q=SRM+Photocopy+Centre",
  },
  {
    id:"s30", name:"SRM Hotel & Guest House", shortName:"SRM Hotel", type:"hostel", emoji:"🏨",
    lat:12.8210, lon:80.0440,
    description:"On-campus guest house for visiting faculty, parents and conference attendees. Clean rooms with AC, attached bath and Wi-Fi.",
    rating:4.1, timing:"24/7 Check-in", priceRange:"₹1,200–2,500/night", tags:["hotel","guest house","accommodation","parents","faculty"],
    imageUrl: IMG.hostel,
    mapUrl: "https://maps.google.com/?q=SRM+Hotel+Guest+House+Kattankulathur",
  },
];

/* ─── Levenshtein distance for fuzzy matching ─── */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m+1 }, (_, i) => Array.from({ length: n+1 }, (_, j) => j === 0 ? i : 0));
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

function score(query, place) {
  const q = query.toLowerCase().trim();
  const nameL = place.name.toLowerCase();
  const shortL = (place.shortName || "").toLowerCase();
  if (nameL.includes(q) || shortL.includes(q)) return 1.0;
  if (place.tags?.some(t => t.includes(q) || q.includes(t))) return 0.85;
  const words = nameL.split(/\s+/);
  const bestFuzz = words.reduce((best, w) => {
    const dist = levenshtein(q, w);
    const sim  = 1 - dist / Math.max(q.length, w.length);
    return Math.max(best, sim);
  }, 0);
  return bestFuzz;
}

export function searchSRMPlaces(query = "", opts = {}) {
  const { type, limit = 10 } = opts;
  if (!query.trim()) return SRM_PLACES.slice(0, limit);
  let results = SRM_PLACES.map(p => ({ ...p, _score: score(query, p) })).filter(p => p._score > 0.3);
  if (type) results = results.filter(p => p.type === type);
  results.sort((a, b) => b._score - a._score);
  return results.slice(0, limit).map(({ _score, ...p }) => p);
}

export function isSRMQuery(query = "") {
  const q = query.toLowerCase();
  return q.includes("srm") || q.includes("kattankulathur") || q.includes("srmist") || q.includes("potheri");
}

/* Category groups for filtering */
export const SRM_CATEGORIES = [
  { id:"all",       label:"All",        types:[] },
  { id:"food",      label:"Food",       types:["food"] },
  { id:"academic",  label:"Academic",   types:["academic","landmark"] },
  { id:"medical",   label:"Medical",    types:["hospital","medical"] },
  { id:"sports",    label:"Sports",     types:["sports"] },
  { id:"stay",      label:"Stay",       types:["hostel"] },
  { id:"transport", label:"Transport",  types:["transport"] },
  { id:"services",  label:"Services",   types:["banking","shop","service"] },
];
