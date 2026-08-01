import type { User } from "@supabase/supabase-js";
import { currentBillingPeriod, getPlan, type PlanId } from "@/lib/plans";

export async function ensureSubscriptionProfile(supabase: any, user: User) {
  let { data: profile, error } = await supabase.from("user_profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) throw error;
  if (!profile) {
    const plan = getPlan("free");
    const result = await supabase.from("user_profiles").insert({ id: user.id, email: user.email, full_name: user.user_metadata?.full_name || user.email?.split("@")[0], avatar_url: user.user_metadata?.avatar_url, plan: "free", searches_today: 0, searches_limit: plan.searchesPerMonth, leads_limit: plan.savedLeads }).select("*").single();
    if (result.error) throw result.error;
    profile = result.data;
  }

  const now = new Date();
  const expired = profile.subscription_status && !["active", "trialing"].includes(profile.subscription_status) || (profile.subscription_current_period_end && new Date(profile.subscription_current_period_end) <= now);
  const supportsMonthlyUsage = Object.prototype.hasOwnProperty.call(profile, "usage_period_end");
  const periodEnded = supportsMonthlyUsage && (!profile.usage_period_end || new Date(profile.usage_period_end) <= now);
  if (expired || periodEnded) {
    const planId: PlanId = expired ? "free" : getPlan(profile.plan).id;
    const plan = getPlan(planId);
    const period = currentBillingPeriod(now);
    const updates: Record<string, unknown> = { plan: planId, searches_today: 0, searches_limit: plan.searchesPerMonth, leads_limit: plan.savedLeads, ai_messages_used: 0, csv_exports_used: 0, usage_period_start: period.start, usage_period_end: period.end };
    if (expired) updates.subscription_status = "inactive";
    const result = await supabase.from("user_profiles").update(updates).eq("id", user.id).select("*").single();
    if (result.error) throw result.error;
    profile = result.data;
  }
  return profile;
}
