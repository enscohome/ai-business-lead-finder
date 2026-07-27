import { Business } from "@/types";
import { generateId } from "./utils";

const businessTypes = [
  "Restaurant", "Hotel", "Salon", "Pharmacy", "Cafe", "Bakery",
  "Barbershop", "Spa", "Gym", "Clinic", "Dental", "Law Firm",
  "Real Estate", "Auto Repair", "Electronics", "Boutique", "Supermarket",
  "Bookstore", "Photography", "Catering", "Event Planning", "Travel Agency",
  "Insurance", "Accounting", "Construction", "Plumbing", "Electrician",
  "Cleaning Service", "Security Service", "Consulting"
];

const nigerianCities = [
  { name: "Lagos", state: "Lagos", lat: 6.5244, lng: 3.3792 },
  { name: "Abuja", state: "FCT", lat: 9.0765, lng: 7.3986 },
  { name: "Port Harcourt", state: "Rivers", lat: 4.8156, lng: 7.0498 },
  { name: "Ibadan", state: "Oyo", lat: 7.3775, lng: 3.9470 },
  { name: "Kano", state: "Kano", lat: 12.0022, lng: 8.5920 },
  { name: "Enugu", state: "Enugu", lat: 6.5244, lng: 7.5186 },
  { name: "Benin City", state: "Edo", lat: 6.3350, lng: 5.6037 },
  { name: "Kaduna", state: "Kaduna", lat: 10.5105, lng: 7.4165 },
  { name: "Owerri", state: "Imo", lat: 5.5720, lng: 7.0588 },
  { name: "Uyo", state: "Akwa Ibom", lat: 5.0377, lng: 7.9128 },
  { name: "Calabar", state: "Cross River", lat: 4.9757, lng: 8.3417 },
  { name: "Abeokuta", state: "Ogun", lat: 7.1453, lng: 3.3570 },
];

const streetNames = [
  "Allen Avenue", "Adetokunbo Ademola Street", "Bourdillon Road", "Awolowo Road",
  "Marina Street", "Broad Street", "Akin Adesola Street", "Kofo Abayomi Street",
  "Ahmadu Bello Way", "Murtala Mohammed Way", "Herbert Macaulay Way", "Obafemi Awolowo Way",
  "Nnamdi Azikiwe Street", "Tafawa Balewa Road", "Independence Avenue", "Constitution Avenue",
  "Sanusi Fafunwa Street", "Bishop Aboyade Cole Street", "Ozumba Mbadiwe Avenue", "Kingsway Road",
  "Glover Road", "Adeola Odeku Street", "Oba Akran Avenue", "Toyin Street", "Opebi Road"
];

const businessPrefixes: Record<string, string[]> = {
  Restaurant: ["Tasty", "Golden", "Royal", "Spice", "Flavors", "Delicious", "Savory", "Urban", "Classic", "Fresh"],
  Hotel: ["Grand", "Royal", "Premier", "Excel", "Paradise", "Sunrise", "Oceanview", "Hilltop", "Central", "Imperial"],
  Salon: ["Glamour", "Elite", "Star", "Divine", "Royal", "Perfect", "Classic", "Modern", "Trendy", "Chic"],
  Pharmacy: ["Health", "Med", "Care", "Life", "Wellness", "Cure", "Remedy", "Vital", "Prime", "Trust"],
  Cafe: ["Brew", "Aroma", "Mocha", "Bean", "Roast", "Steam", "Grind", "Sip", "Velvet", "Copper"],
  Bakery: ["Sweet", "Golden", "Crust", "Oven", "Dough", "Butter", "Sugar", "Flour", "Heavenly", "Delight"],
  Barbershop: ["Sharp", "Clean", "Classic", "Urban", "Fresh", "Elite", "Prime", "Style", "Cut", "Edge"],
  Spa: ["Serene", "Bliss", "Tranquil", "Pure", "Zen", "Harmony", "Oasis", "Elysian", "Calm", "Radiant"],
  Gym: ["Power", "Fit", "Iron", "Core", "Peak", "Prime", "Elite", "Strong", "Flex", "Pulse"],
  Clinic: ["Care", "Health", "Wellness", "Med", "Life", "Hope", "Prime", "Trust", "Family", "Community"],
};

const businessSuffixes: Record<string, string[]> = {
  Restaurant: ["Kitchen", "Eatery", "Diner", "Bistro", "Grill", "Place", "Spot", "Hub", "Lounge", "Cuisine"],
  Hotel: ["Hotel", "Suites", "Inn", "Resort", "Plaza", "Grand", "Palace", "Lodge", "Court", "Heights"],
  Salon: ["Salon", "Studio", "Hub", "Place", "Lounge", "Spot", "Gallery", "Boutique", "Center", "Parlor"],
  Pharmacy: ["Pharmacy", "Chemist", "Drugstore", "Meds", "Health", "Care", "Plus", "Mart", "Shop", "Store"],
  Cafe: ["Cafe", "Coffee", "Espresso", "Lounge", "Spot", "House", "Bar", "Joint", "Place", "Hub"],
  Bakery: ["Bakery", "Bakes", "Cakes", "Pastries", "Delights", "Treats", "Oven", "Shop", "House", "Corner"],
  Barbershop: ["Barbers", "Cuts", "Shop", "Studio", "Lounge", "Place", "Hub", "Grooming", "Styles", "Barbershop"],
  Spa: ["Spa", "Wellness", "Retreat", "Sanctuary", "Oasis", "Center", "Studio", "Lounge", "Place", "Haven"],
  Gym: ["Gym", "Fitness", "Training", "Works", "Club", "Center", "Studio", "Hub", "Zone", "Arena"],
  Clinic: ["Clinic", "Medical", "Health", "Care", "Center", "Hospital", "Practice", "Services", "Hub", "Plus"],
};

function getBusinessName(type: string): string {
  const prefixes = businessPrefixes[type] || businessPrefixes["Restaurant"];
  const suffixes = businessSuffixes[type] || businessSuffixes["Restaurant"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix} ${suffix}`;
}

function generatePhone(): string {
  const prefixes = ["0803", "0805", "0806", "0807", "0809", "0810", "0811", "0812", "0813", "0814", "0815", "0816", "0817", "0818", "0819", "0901", "0902", "0903", "0904", "0905", "0906", "0907", "0908", "0909", "0701", "0703", "0704", "0705", "0706"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
  return `${prefix}${suffix}`;
}

function generateAddress(city: string, state: string): string {
  const number = Math.floor(Math.random() * 200) + 1;
  const street = streetNames[Math.floor(Math.random() * streetNames.length)];
  return `${number} ${street}, ${city}, ${state} State`;
}

function generateWebsite(businessName: string, hasWebsite: boolean): string | null {
  if (!hasWebsite) return null;
  const slug = businessName.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
  const domains = [".com.ng", ".com", ".ng", ".net"];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `https://www.${slug}${domain}`;
}

function determineWebsiteStatus(): { status: "modern" | "outdated" | "none"; hasWebsite: boolean } {
  const rand = Math.random();
  if (rand < 0.35) return { status: "none", hasWebsite: false };
  if (rand < 0.65) return { status: "outdated", hasWebsite: true };
  return { status: "modern", hasWebsite: true };
}

function calculateOpportunityScore(websiteStatus: string): "low" | "medium" | "high" {
  switch (websiteStatus) {
    case "none": return "high";
    case "outdated": return "medium";
    case "modern": return "low";
    default: return "medium";
  }
}

export function generateMockBusinesses(
  businessType: string,
  city: string,
  state: string,
  country: string = "Nigeria",
  count: number = 12
): Business[] {
  const cityData = nigerianCities.find(
    (c) => c.name.toLowerCase() === city.toLowerCase()
  ) || nigerianCities[0];

  const businesses: Business[] = [];

  for (let i = 0; i < count; i++) {
    const type = businessType || businessTypes[Math.floor(Math.random() * businessTypes.length)];
    const name = getBusinessName(type);
    const { status: websiteStatus, hasWebsite } = determineWebsiteStatus();
    const lat = cityData.lat + (Math.random() - 0.5) * 0.1;
    const lng = cityData.lng + (Math.random() - 0.5) * 0.1;

    businesses.push({
      id: generateId(),
      name,
      phone: generatePhone(),
      address: generateAddress(cityData.name, cityData.state),
      city: cityData.name,
      state: cityData.state,
      country,
      businessType: type,
      website: generateWebsite(name, hasWebsite),
      websiteStatus,
      opportunityScore: calculateOpportunityScore(websiteStatus),
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      latitude: lat,
      longitude: lng,
      rating: Number((3 + Math.random() * 2).toFixed(1)),
      reviewCount: Math.floor(Math.random() * 200),
      createdAt: new Date().toISOString(),
    });
  }

  return businesses;
}

export function searchBusinesses(
  query: string,
  city?: string,
  state?: string,
  country: string = "Nigeria"
): Business[] {
  const normalizedQuery = query.toLowerCase().trim();

  // Extract business type from query
  let businessType = "";
  for (const type of businessTypes) {
    if (normalizedQuery.includes(type.toLowerCase())) {
      businessType = type;
      break;
    }
  }

  // Extract city from query
  let searchCity = city || "";
  let searchState = state || "";

  if (!searchCity) {
    for (const c of nigerianCities) {
      if (normalizedQuery.includes(c.name.toLowerCase())) {
        searchCity = c.name;
        searchState = c.state;
        break;
      }
    }
  }

  if (!searchCity) {
    searchCity = "Lagos";
    searchState = "Lagos";
  }

  if (!businessType) {
    businessType = businessTypes[Math.floor(Math.random() * 10)];
  }

  return generateMockBusinesses(businessType, searchCity, searchState, country, 12);
}
