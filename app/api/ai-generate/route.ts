import { NextRequest, NextResponse } from "next/server";
import { Business } from "@/types";
import { generateAllSalesTools } from "@/lib/ai-tools";
import { createClient } from "@/lib/supabase/server";
import { ensureSubscriptionProfile } from "@/lib/subscription";
import { getPlan } from "@/lib/plans";
import { enforceCountryFeature } from "@/lib/country-access";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "You must be logged in to generate outreach messages." }, { status: 401 });
    const access = await enforceCountryFeature(supabase, user, "ai_outreach");
    if (!access.allowed) return access.response;
    const profile = await ensureSubscriptionProfile(supabase, user);
    const plan = getPlan(profile.plan);
    if ((profile.ai_messages_used || 0) >= plan.aiMessagesPerMonth) return NextResponse.json({ error: `You have reached your ${plan.name} AI outreach limit for this month.`, upgradeUrl: "/pricing" }, { status: 429 });
    const body = await request.json();
    const { business } = body as { business: Business };

    if (!business) {
      return NextResponse.json(
        { error: "Business data is required" },
        { status: 400 }
      );
    }

    const tools = generateAllSalesTools(business);
    await supabase.from("user_profiles").update({ ai_messages_used: (profile.ai_messages_used || 0) + 1 }).eq("id", user.id);
    return NextResponse.json({ tools });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate sales tools" },
      { status: 500 }
    );
  }
}
