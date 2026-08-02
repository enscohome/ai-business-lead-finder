import type { User } from "@supabase/supabase-js";
import { getPlan, isWebsitePromptPaidPlan, type PlanId } from "@/lib/plans";
import { enforceCountryFeature } from "@/lib/country-access";

export type WebsitePromptAccessReason =
  | "ALLOWED"
  | "PREMIUM_REQUIRED"
  | "SUBSCRIPTION_EXPIRED"
  | "PAYMENT_FAILED"
  | "ACCOUNT_SUSPENDED"
  | "COUNTRY_UNAVAILABLE";
export interface WebsitePromptEntitlement {
  allowed: boolean;
  readOnly: boolean;
  currentPlan: { id: PlanId; name: string };
  previousPlan: { id: PlanId; name: string } | null;
  subscriptionStatus: string;
  reason: WebsitePromptAccessReason;
  upgradeUrl: string;
  expiresAt: string | null;
  resetAt: string | null;
  generationsUsed: number;
  generationsLimit: number;
  renewalPriceNgn: number;
  planBenefits: string[];
  isAdminOverride: boolean;
}
export function evaluateWebsitePromptAccess(input: {
  plan: unknown;
  previousPaidPlan?: unknown;
  subscriptionStatus?: string | null;
  subscriptionEnd?: string | null;
  isAdmin?: boolean;
  isSuspended?: boolean;
  countryAllowed?: boolean;
  now?: number;
}): Pick<WebsitePromptEntitlement, "allowed" | "readOnly" | "reason"> {
  if (input.isSuspended)
    return { allowed: false, readOnly: false, reason: "ACCOUNT_SUSPENDED" };
  if (!input.countryAllowed)
    return { allowed: false, readOnly: false, reason: "COUNTRY_UNAVAILABLE" };
  if (input.isAdmin)
    return { allowed: true, readOnly: false, reason: "ALLOWED" };
  const paid = isWebsitePromptPaidPlan(input.plan);
  const previous = isWebsitePromptPaidPlan(input.previousPaidPlan);
  const end = input.subscriptionEnd ? Date.parse(input.subscriptionEnd) : NaN;
  const paidThrough = Number.isFinite(end) && end > (input.now ?? Date.now());
  const status = String(input.subscriptionStatus || "").toLowerCase();
  const statusAllows =
    ["active", "trialing"].includes(status) ||
    (status === "cancelled" && paidThrough);
  if (paid && statusAllows && paidThrough)
    return { allowed: true, readOnly: false, reason: "ALLOWED" };
  if (["past_due", "failed", "payment_failed"].includes(status))
    return {
      allowed: false,
      readOnly: paid || previous,
      reason: "PAYMENT_FAILED",
    };
  if ((paid && !paidThrough) || previous)
    return { allowed: false, readOnly: true, reason: "SUBSCRIPTION_EXPIRED" };
  return { allowed: false, readOnly: false, reason: "PREMIUM_REQUIRED" };
}
export async function getWebsitePromptEntitlement(
  supabase: any,
  user: User,
): Promise<WebsitePromptEntitlement> {
  const fallbackPlan = getPlan("free");
  const { data: profile } = await supabase
    .from("user_profiles")
    .select(
      "plan,subscription_status,subscription_current_period_end,usage_period_end,website_prompt_generations_used,country_code,is_suspended,previous_paid_plan",
    )
    .eq("id", user.id)
    .maybeSingle();
  const { data: isAdmin } = await supabase.rpc("is_leadpilot_admin");
  const plan = getPlan(profile?.plan);
  const previous =
    profile?.previous_paid_plan &&
    isWebsitePromptPaidPlan(profile.previous_paid_plan)
      ? getPlan(profile.previous_paid_plan)
      : null;
  const planLimit = plan.websitePromptGenerationsPerMonth;
  const renewalPlan = previous || plan;
  const resetAt = profile?.usage_period_end || null;
  const effectiveUsed =
    resetAt && Date.parse(resetAt) <= Date.now()
      ? 0
      : profile?.website_prompt_generations_used || 0;
  const base = {
    currentPlan: {
      id: plan.id,
      name: plan.name,
    },
    previousPlan: previous ? { id: previous.id, name: previous.name } : null,
    subscriptionStatus: profile?.subscription_status || "missing",
    upgradeUrl: "/pricing",
    expiresAt: profile?.subscription_current_period_end || null,
    resetAt,
    generationsUsed: effectiveUsed,
    generationsLimit: planLimit,
    renewalPriceNgn: renewalPlan.priceNgn,
    planBenefits: renewalPlan.features,
    isAdminOverride: Boolean(isAdmin),
  };
  const country = await enforceCountryFeature(
    supabase,
    user,
    "website_prompt_builder",
    profile?.country_code || "NG",
  );
  const decision = evaluateWebsitePromptAccess({
    plan: profile?.plan,
    previousPaidPlan: profile?.previous_paid_plan,
    subscriptionStatus: profile?.subscription_status,
    subscriptionEnd: profile?.subscription_current_period_end,
    isAdmin: Boolean(isAdmin),
    isSuspended: Boolean(profile?.is_suspended),
    countryAllowed: country.allowed,
  });
  if (decision.reason === "SUBSCRIPTION_EXPIRED") {
    const period =
      profile?.subscription_current_period_end ||
      profile?.usage_period_end ||
      new Date(0).toISOString();
    await supabase.rpc("record_website_prompt_expiry_notification", {
      p_user_id: user.id,
      p_period_start: period,
    });
    return {
      ...base,
      ...decision,
      generationsLimit: (previous || plan).websitePromptGenerationsPerMonth,
    };
  }
  if (decision.reason === "PREMIUM_REQUIRED")
    return {
      ...base,
      ...decision,
      generationsLimit: fallbackPlan.websitePromptGenerationsPerMonth,
    };
  return {
    ...base,
    ...decision,
    generationsLimit:
      decision.allowed && isAdmin ? Math.max(planLimit, 20) : planLimit,
  };
}

export function entitlementError(entitlement: WebsitePromptEntitlement) {
  const messages: Record<WebsitePromptAccessReason, string> = {
    ALLOWED: "Allowed",
    PREMIUM_REQUIRED:
      "Website Prompt Builder is available on LeadPilot AI paid plans.",
    SUBSCRIPTION_EXPIRED:
      "Your Website Prompt Builder subscription has expired.",
    PAYMENT_FAILED: "Your latest subscription payment was unsuccessful.",
    ACCOUNT_SUSPENDED: "This account is suspended.",
    COUNTRY_UNAVAILABLE:
      "Website Prompt Builder is not available in your country.",
  };
  const status =
    entitlement.reason === "PREMIUM_REQUIRED"
      ? 402
      : entitlement.reason === "ACCOUNT_SUSPENDED"
        ? 403
        : 403;
  return {
    status,
    body: {
      error: messages[entitlement.reason],
      code: entitlement.reason,
      entitlement,
    },
  };
}
