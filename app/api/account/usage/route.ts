import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureSubscriptionProfile } from "@/lib/subscription";
import { getPlan } from "@/lib/plans";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const profile = await ensureSubscriptionProfile(supabase, user);
    const plan = getPlan(profile.plan);
    const { count: savedLeads = 0 } = await supabase.from("saved_leads").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    return NextResponse.json({ plan, searchesUsed: profile.searches_today || 0, searchesLimit: plan.searchesPerMonth, savedLeads, savedLeadsLimit: plan.savedLeads, aiMessagesUsed: profile.ai_messages_used || 0, csvExportsUsed: profile.csv_exports_used || 0, periodEnd: profile.usage_period_end });
  } catch { return NextResponse.json({ error: "Could not load plan usage." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { feature } = await request.json();
    const profile = await ensureSubscriptionProfile(supabase, user);
    const plan = getPlan(profile.plan);
    if (feature === "csv_export") {
      if (plan.csvExportsPerMonth === 0 || (profile.csv_exports_used || 0) >= plan.csvExportsPerMonth) return NextResponse.json({ error: `CSV export is not available within your ${plan.name} allowance.`, upgradeUrl: "/pricing" }, { status: 403 });
      await supabase.from("user_profiles").update({ csv_exports_used: (profile.csv_exports_used || 0) + 1 }).eq("id", user.id);
      return NextResponse.json({ allowed: true });
    }
    return NextResponse.json({ error: "Unknown feature." }, { status: 400 });
  } catch { return NextResponse.json({ error: "Could not verify this feature." }, { status: 500 }); }
}
