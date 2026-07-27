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

## Stripe Integration (Subscriptions)

1. Install Stripe:
   ```bash
   npm install stripe @stripe/stripe-js
   ```

2. Create checkout session:
   ```typescript
   // app/api/checkout/route.ts
   import Stripe from "stripe";
   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

   export async function POST(req: Request) {
     const session = await stripe.checkout.sessions.create({
       mode: "subscription",
       line_items: [{ price: "price_xxx", quantity: 1 }],
       success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=true`,
       cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?canceled=true`,
     });
     return Response.json({ url: session.url });
   }
   ```

3. Webhook to update user plan:
   ```typescript
   // app/api/webhooks/stripe/route.ts
   export async function POST(req: Request) {
     const event = stripe.webhooks.constructEvent(
       await req.text(),
       req.headers.get("stripe-signature")!,
       process.env.STRIPE_WEBHOOK_SECRET!
     );

     if (event.type === "checkout.session.completed") {
       // Update user profile plan to "pro"
     }
   }
   ```
