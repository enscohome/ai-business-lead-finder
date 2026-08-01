import { NextRequest, NextResponse } from "next/server";
import { Business, OpportunityService } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { getServiceLabel, scoreOpportunity } from "@/lib/opportunity";
import { ensureSubscriptionProfile } from "@/lib/subscription";
import { getPlan, LAUNCH_COUNTRY } from "@/lib/plans";
import { enforceCountryFeature } from "@/lib/country-access";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

interface GooglePlace {
  place_id: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  geometry?: {
    location: { lat: number; lng: number };
  };
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
}

interface GooglePlaceDetails {
  result: {
    name: string;
    formatted_phone_number?: string;
    formatted_address?: string;
    website?: string;
    url?: string;
    rating?: number;
    user_ratings_total?: number;
    geometry?: {
      location: { lat: number; lng: number };
    };
    address_components?: Array<{
      long_name: string;
      types: string[];
    }>;
  };
}

function determineWebsiteStatus(website?: string): "modern" | "outdated" | "none" {
  if (!website) return "none";
  // Simple heuristic - in production you'd scrape or analyze the site
  const domain = website.toLowerCase();
  if (domain.includes("wix") || domain.includes("wordpress") || domain.includes("blogspot")) {
    return "outdated";
  }
  return "modern";
}

function mapBusinessType(types: string[] = []): string {
  const typeMap: Record<string, string> = {
    restaurant: "Restaurant",
    cafe: "Cafe",
    bakery: "Bakery",
    bar: "Bar",
    lodging: "Hotel",
    beauty_salon: "Salon",
    hair_care: "Salon",
    spa: "Spa",
    gym: "Gym",
    health: "Clinic",
    doctor: "Clinic",
    dentist: "Dental",
    pharmacy: "Pharmacy",
    lawyer: "Law Firm",
    real_estate_agency: "Real Estate",
    car_repair: "Auto Repair",
    electronics_store: "Electronics",
    clothing_store: "Boutique",
    supermarket: "Supermarket",
    book_store: "Bookstore",
    travel_agency: "Travel Agency",
    insurance_agency: "Insurance",
    accounting: "Accounting",
    plumber: "Plumbing",
    electrician: "Electrician",
  };

  for (const type of types) {
    if (typeMap[type]) return typeMap[type];
  }
  return "Business";
}

function extractCity(addressComponents?: Array<{ long_name: string; types: string[] }>): string {
  if (!addressComponents) return "";
  const city = addressComponents.find((c) => 
    c.types.includes("locality") || c.types.includes("administrative_area_level_2")
  );
  return city?.long_name || "";
}

function extractState(addressComponents?: Array<{ long_name: string; types: string[] }>): string {
  if (!addressComponents) return "";
  const state = addressComponents.find((c) => 
    c.types.includes("administrative_area_level_1")
  );
  return state?.long_name || "";
}

export async function GET(request: NextRequest) {
  const supabase = createClient();

const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  return NextResponse.json(
    { error: "You must be logged in to search." },
    { status: 401 }
  );
}
let profile;
try {
  profile = await ensureSubscriptionProfile(supabase, user);
} catch {
  return NextResponse.json(
    { error: "Could not load your search allowance." },
    { status: 500 }
  );
}
const plan = getPlan(profile.plan);
if (profile.searches_today >= plan.searchesPerMonth) {
  return NextResponse.json(
    {
      error: `You have reached your ${plan.name} limit of ${plan.searchesPerMonth} searches this month.`,
      upgradeUrl: "/pricing",
      searchesToday: profile.searches_today,
      searchesLimit: plan.searchesPerMonth,
    },
    { status: 429 }
  );
}
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || searchParams.get("type") || ""
  const city = searchParams.get("city") || "";
  const area = searchParams.get("area") || "";
  const state = searchParams.get("state") || "";
  const country = searchParams.get("country") || LAUNCH_COUNTRY;
  const service = (searchParams.get("service") || "website-design") as OpportunityService;
  const customService = searchParams.get("customService") || "";
  const access = await enforceCountryFeature(supabase, user, "business_search", country);
  if (!access.allowed) return access.response;

  if (!GOOGLE_PLACES_API_KEY) {
    return NextResponse.json(
      { error: "Google Places API key not configured", businesses: [] },
      { status: 500 }
    );
  }

  try {
    // Step 1: Geocode the city to get coordinates
    const locationParts = [area, city, state, country].filter(Boolean);
    const geocodeQuery = locationParts.length > 1 ? locationParts.join(", ") : (city || query);
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(geocodeQuery)}&key=${GOOGLE_PLACES_API_KEY}`;

    const geoRes = await fetch(geocodeUrl);
    const geoData = await geoRes.json();
    if (geoData.status === "ZERO_RESULTS" || !geoData.results?.[0]) {
      return NextResponse.json({ businesses: [], count: 0, source: "google_places" });
    }
    if (geoData.status !== "OK") {
      return NextResponse.json(
        { error: "Google could not resolve the selected location.", businesses: [] },
        { status: 502 }
      );
    }
    const location = geoData.results[0].geometry.location;

    // Step 2: Search for businesses near that location
    const searchQuery = query || "business";
    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=10000&keyword=${encodeURIComponent(searchQuery)}&key=${GOOGLE_PLACES_API_KEY}`;

    const placesRes = await fetch(placesUrl);
    const placesData = await placesRes.json();

    if (placesData.status === "ZERO_RESULTS") {
      return NextResponse.json({ businesses: [], count: 0, source: "google_places" });
    }
    if (placesData.status !== "OK" || !placesData.results) {
      return NextResponse.json(
        { error: "Google Places search is temporarily unavailable.", businesses: [] },
        { status: 502 }
      );
    }

    // Step 3: Get details for each place (limited to 12 for performance)
    const places: GooglePlace[] = placesData.results.slice(0, 12);

    const businesses: Business[] = await Promise.all(
      places.map(async (place): Promise<Business> => {
        // Get place details
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_phone_number,formatted_address,website,url,rating,user_ratings_total,geometry,address_components&key=${GOOGLE_PLACES_API_KEY}`;

        const detailsRes = await fetch(detailsUrl);
        const detailsData: GooglePlaceDetails = await detailsRes.json();
        const result = detailsData.result || {};

        const websiteStatus = determineWebsiteStatus(result.website);
        const address = result.formatted_address || place.vicinity || "";
        const extractedCity = city || extractCity(result.address_components) || "";
        const extractedState = state || extractState(result.address_components) || "";
        const opportunity = scoreOpportunity({
          websiteStatus,
          phone: result.formatted_phone_number || "",
          rating: result.rating || place.rating,
          reviewCount: result.user_ratings_total || place.user_ratings_total,
          service,
          customService,
        });

        return {
          id: place.place_id,
          name: result.name || place.name,
          phone: result.formatted_phone_number || "",
          address,
          city: extractedCity,
          area: area || undefined,
          state: extractedState,
          country,
          businessType: mapBusinessType(place.types),
          website: result.website || null,
          websiteStatus,
          opportunityScore: opportunity.score,
          opportunityReasons: opportunity.reasons,
          targetService: service,
          targetServiceLabel: getServiceLabel(service, customService),
          source: "google_places",
          googleMapsUrl: result.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
          latitude: result.geometry?.location?.lat || location.lat,
          longitude: result.geometry?.location?.lng || location.lng,
          rating: result.rating || place.rating,
          reviewCount: result.user_ratings_total || place.user_ratings_total,
          createdAt: new Date().toISOString(),
        };
      })
    );

   let updatedSearchCount = profile.searches_today;

if (businesses.length > 0) {
  const { data: newCount, error: countError } = await supabase.rpc(
    "increment_search_count",
    { user_id: user.id }
  );

  if (countError) {
    console.error("Failed to update search count:", countError);
  } else if (typeof newCount === "number") {
    updatedSearchCount = newCount;
  }
}

return NextResponse.json({
  businesses,
  count: businesses.length,
  searchesToday: updatedSearchCount,
  searchesLimit: plan.searchesPerMonth,
  source: "google_places",
  provenance: {
    provider: "google_places",
    permittedUse: "transient_display_requires_review",
    attributionRequired: true,
    retrievedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + Math.max(1, Number(process.env.GOOGLE_PLACES_TRANSIENT_CACHE_MINUTES || "15")) * 60_000).toISOString(),
  },
});
  } catch (error) {
    console.error("Google Places API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch business data", businesses: [] },
      { status: 500 }
    );
  }
}
