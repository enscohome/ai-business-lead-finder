import type { User } from "@supabase/supabase-js";
import {
  currentBillingPeriod,
  getPlan,
  isWebsitePromptPaidPlan,
  type PlanId,
} from "@/lib/plans";
import { enforceCountryFeature } from "@/lib/country-access";

export type WebsitePromptAccessReason =
  | "ALLOWED"
  | "LEGACY_PAID_PLAN_ACCESS"
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
  subscriptionCancelAtPeriodEnd: boolean;
  reason: WebsitePromptAccessReason;
  upgradeUrl: string;
  expiresAt: string | null;
  periodStartAt: string | null;
  resetAt: string | null;
  generationsUsed: number;
  generationsLimit: number;
  renewalPriceNgn: number;
  planBenefits: string[];
}
export function evaluateWebsitePromptAccess(input: {
  plan: unknown;
  previousPaidPlan?: unknown;
  subscriptionStatus?: string | null;
  subscriptionStart?: string | null;
  subscriptionEnd?: string | null;
  isSuspended?: boolean;
  countryAllowed?: boolean;
  now?: number;
}): Pick<WebsitePromptEntitlement, "allowed" | "readOnly" | "reason"> {
  if (input.isSuspended)
    return { allowed: false, readOnly: false, reason: "ACCOUNT_SUSPENDED" };
  if (!input.countryAllowed)
    return { allowed: false, readOnly: false, reason: "COUNTRY_UNAVAILABLE" };
  const paid = isWebsitePromptPaidPlan(input.plan);
  const previous = isWebsitePromptPaidPlan(input.previousPaidPlan);
  const hasSubscriptionMetadata =
    input.subscriptionStatus != null ||
    input.subscriptionStart != null ||
    input.subscriptionEnd != null;
  if (paid && !hasSubscriptionMetadata)
    return {
      allowed: true,
      readOnly: false,
      reason: "LEGACY_PAID_PLAN_ACCESS",
    };
  const start = input.subscriptionStart
    ? Date.parse(input.subscriptionStart)
    : NaN;
  const end = input.subscriptionEnd ? Date.parse(input.subscriptionEnd) : NaN;
  const now = input.now ?? Date.now();
  const periodIsCurrent =
    Number.isFinite(start) && start <= now && Number.isFinite(end) && end > now;
  const status = String(input.subscriptionStatus || "").toLowerCase();
  const statusAllows = ["active", "trialing", "cancelled", "canceled"].includes(
    status,
  );
  if (paid && statusAllows && periodIsCurrent)
    return { allowed: true, readOnly: false, reason: "ALLOWED" };
  if (["past_due", "failed", "payment_failed"].includes(status))
    return {
      allowed: false,
      readOnly: paid || previous,
      reason: "PAYMENT_FAILED",
    };
  if (
    ["inactive", "disabled"].includes(status) ||
    (paid && hasSubscriptionMetadata) ||
    previous
  )
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
      "plan,subscription_status,subscription_current_period_start,subscription_current_period_end,subscription_cancel_at_period_end,usage_period_start,usage_period_end,website_prompt_generations_used,country_code,is_suspended,previous_paid_plan",
    )
    .eq("id", user.id)
    .maybeSingle();
  const plan = getPlan(profile?.plan);
  const previous =
    profile?.previous_paid_plan &&
    isWebsitePromptPaidPlan(profile.previous_paid_plan)
      ? getPlan(profile.previous_paid_plan)
      : null;
  const planLimit = plan.websitePromptGenerationsPerMonth;
  const renewalPlan = previous || plan;
  const now = Date.now();
  const subscriptionMetadataMissing =
    profile?.subscription_status == null &&
    profile?.subscription_current_period_start == null &&
    profile?.subscription_current_period_end == null;
  const legacyPaidAccess =
    isWebsitePromptPaidPlan(profile?.plan) && subscriptionMetadataMissing;
  const calendarPeriod = currentBillingPeriod(new Date(now));
  const usageEndIsCurrent =
    profile?.usage_period_end && Date.parse(profile.usage_period_end) > now;
  const periodStartAt = legacyPaidAccess
    ? usageEndIsCurrent
      ? profile?.usage_period_start || calendarPeriod.start
      : calendarPeriod.start
    : profile?.subscription_current_period_start || null;
  const resetAt = legacyPaidAccess
    ? usageEndIsCurrent
      ? profile.usage_period_end
      : calendarPeriod.end
    : profile?.subscription_current_period_end || null;
  const usageMatchesSubscription = legacyPaidAccess
    ? Boolean(usageEndIsCurrent)
    : Boolean(
        periodStartAt &&
        resetAt &&
        profile?.usage_period_start &&
        profile?.usage_period_end &&
        Date.parse(profile.usage_period_start) === Date.parse(periodStartAt) &&
        Date.parse(profile.usage_period_end) === Date.parse(resetAt),
      );
  const effectiveUsed =
    resetAt && Date.parse(resetAt) > now && usageMatchesSubscription
      ? profile?.website_prompt_generations_used || 0
      : 0;
  const base = {
    currentPlan: {
      id: plan.id,
      name: plan.name,
    },
    previousPlan: previous ? { id: previous.id, name: previous.name } : null,
    subscriptionStatus: profile?.subscription_status || "missing",
    subscriptionCancelAtPeriodEnd: Boolean(
      profile?.subscription_cancel_at_period_end,
    ),
    upgradeUrl: "/pricing",
    expiresAt: profile?.subscription_current_period_end || null,
    periodStartAt,
    resetAt,
    generationsUsed: effectiveUsed,
    generationsLimit: planLimit,
    renewalPriceNgn: renewalPlan.priceNgn,
    planBenefits: renewalPlan.features,
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
    subscriptionStart: profile?.subscription_current_period_start,
    subscriptionEnd: profile?.subscription_current_period_end,
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
    generationsLimit: planLimit,
  };
}

export function entitlementError(entitlement: WebsitePromptEntitlement) {
  const messages: Record<WebsitePromptAccessReason, string> = {
    ALLOWED: "Allowed",
    LEGACY_PAID_PLAN_ACCESS:
      "Allowed through temporary legacy paid-plan access.",
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
