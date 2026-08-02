import type { User } from "@supabase/supabase-js";
import {
  currentBillingPeriod,
  getPlan,
  isWebsitePromptPaidPlan,
  type PlanId,
} from "@/lib/plans";
import { getOwnerAccess } from "@/lib/owner-access";

export async function ensureSubscriptionProfile(supabase: any, user: User) {
  const ownerAccess = await getOwnerAccess(supabase, user.id);
  let { data: profile, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!profile) {
    const plan = getPlan("free");
    const result = await supabase
      .from("user_profiles")
      .insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0],
        avatar_url: user.user_metadata?.avatar_url,
        plan: "free",
        searches_today: 0,
        searches_limit: plan.searchesPerMonth,
        leads_limit: plan.savedLeads,
      })
      .select("*")
      .single();
    if (result.error) throw result.error;
    profile = result.data;
  }

  if (ownerAccess.isOwner) return { ...profile, is_owner: true };

  const now = new Date();
  const hasSubscriptionMetadata =
    profile.subscription_status != null ||
    profile.subscription_current_period_start != null ||
    profile.subscription_current_period_end != null;
  const legacyPaidAccess =
    isWebsitePromptPaidPlan(profile.plan) && !hasSubscriptionMetadata;
  const subscriptionStarted =
    profile.subscription_current_period_start &&
    new Date(profile.subscription_current_period_start) <= now;
  const paidThrough =
    profile.subscription_current_period_end &&
    new Date(profile.subscription_current_period_end) > now;
  const allowedStatus =
    ["active", "trialing", "cancelled", "canceled"].includes(
      String(profile.subscription_status || "").toLowerCase(),
    ) &&
    subscriptionStarted &&
    paidThrough;
  const expired =
    isWebsitePromptPaidPlan(profile.plan) &&
    hasSubscriptionMetadata &&
    !allowedStatus;
  const supportsMonthlyUsage = Object.prototype.hasOwnProperty.call(
    profile,
    "usage_period_end",
  );
  const sameInstant = (left: unknown, right: unknown) =>
    typeof left === "string" &&
    typeof right === "string" &&
    Number.isFinite(Date.parse(left)) &&
    Date.parse(left) === Date.parse(right);
  const subscriptionPeriodMismatch =
    allowedStatus &&
    (!sameInstant(
      profile.usage_period_start,
      profile.subscription_current_period_start,
    ) ||
      !sameInstant(
        profile.usage_period_end,
        profile.subscription_current_period_end,
      ));
  const periodEnded =
    supportsMonthlyUsage &&
    (subscriptionPeriodMismatch ||
      ((profile.plan === "free" || legacyPaidAccess) &&
        (!profile.usage_period_end ||
          new Date(profile.usage_period_end) <= now)));
  if (expired || periodEnded) {
    const planId: PlanId = expired ? "free" : getPlan(profile.plan).id;
    const plan = getPlan(planId);
    const period =
      allowedStatus &&
      profile.subscription_current_period_start &&
      profile.subscription_current_period_end
        ? {
            start: profile.subscription_current_period_start,
            end: profile.subscription_current_period_end,
          }
        : currentBillingPeriod(now);
    const updates: Record<string, unknown> = {
      plan: planId,
      searches_today: 0,
      searches_limit: plan.searchesPerMonth,
      leads_limit: plan.savedLeads,
      ai_messages_used: 0,
      website_prompt_generations_used: 0,
      csv_exports_used: 0,
      usage_period_start: period.start,
      usage_period_end: period.end,
    };
    if (expired) {
      updates.subscription_status = "inactive";
      updates.subscription_cancel_at_period_end = false;
      if (profile.plan !== "free") updates.previous_paid_plan = profile.plan;
    }
    const result = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("id", user.id)
      .select("*")
      .single();
    if (result.error) throw result.error;
    profile = result.data;
  }
  return { ...profile, is_owner: false };
}
