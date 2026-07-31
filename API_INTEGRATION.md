# API Integration Guide

## Google Places API Integration

Replace the mock data in `app/api/search/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const city = searchParams.get("city") || "";

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  // 1. Geocode the city to get coordinates
  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city)}&key=${apiKey}`;
  const geoRes = await fetch(geocodeUrl);
  const geoData = await geoRes.json();
  const location = geoData.results[0]?.geometry?.location;

  // 2. Search for businesses near that location
  const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=5000&type=${encodeURIComponent(query)}&key=${apiKey}`;
  const placesRes = await fetch(placesUrl);
  const placesData = await placesRes.json();

  // 3. Get details for each place
  const businesses = await Promise.all(
    placesData.results.map(async (place: any) => {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_phone_number,formatted_address,website,rating,user_ratings_total,geometry&key=${apiKey}`;
      const detailsRes = await fetch(detailsUrl);
      const details = await detailsRes.json();

      return {
        id: place.place_id,
        name: details.result.name,
        phone: details.result.formatted_phone_number || "",
        address: details.result.formatted_address || place.vicinity,
        city,
        website: details.result.website || null,
        // ... map other fields
      };
    })
  );

  return NextResponse.json({ businesses, count: businesses.length });
}
```

## Supabase Integration

Replace localStorage calls with Supabase in the search page:

```typescript
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// Instead of localStorage.getItem("savedLeads"):
const { data: leads } = await supabase
  .from("saved_leads")
  .select("*, business:businesses(*)")
  .eq("user_id", user.id);

// Instead of localStorage.setItem("savedLeads"):
await supabase.from("saved_leads").insert({
  user_id: user.id,
  business_id: business.id,
  status: "new",
});
```

## OpenAI Integration

The OpenAI integration is already built in `lib/openai.ts`. To enable it:

1. Add your API key to `.env.local`:
   ```
   OPENAI_API_KEY=sk-...
   NEXT_PUBLIC_OPENAI_ENABLED=true
   ```

2. The lead detail page will automatically use OpenAI when the flag is set.

## Paystack Integration (Subscriptions)

1. Create monthly test plans in the verified adult-owned Paystack merchant account.
2. Add only test keys and plan codes to the local environment variables documented in `.env.local.example`.
3. Apply the staged Supabase migration through the normal reviewed migration workflow.
4. Configure the Paystack test webhook URL as `/api/webhooks/paystack`.
5. Checkout is initialized by `/api/checkout`; successful browser returns are independently verified by `/api/payments/paystack/callback` before access is granted.

The secret key is server-only. Plan access is granted only after a verified successful Paystack transaction or signed successful recurring-charge webhook.
