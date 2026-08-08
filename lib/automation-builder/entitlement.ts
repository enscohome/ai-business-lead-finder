import type { User } from "@supabase/supabase-js";
import { enforceCountryFeature } from "@/lib/country-access";
import {
  getWebsitePromptEntitlement,
  type WebsitePromptEntitlement,
} from "@/lib/website-prompt-entitlement";

export type AutomationBuilderEntitlement = WebsitePromptEntitlement;

export async function getAutomationBuilderEntitlement(
  supabase: any,
  user: User,
): Promise<AutomationBuilderEntitlement> {
  const entitlement = await getWebsitePromptEntitlement(supabase, user);
  if (entitlement.isOwner) return entitlement;
  const country = await enforceCountryFeature(
    supabase,
    user,
    "automation_builder",
    "NG",
  );
  if (!country.allowed)
    return {
      ...entitlement,
      allowed: false,
      readOnly: false,
      reason: "COUNTRY_UNAVAILABLE",
    };
  return entitlement;
}

export function automationEntitlementError(
  entitlement: AutomationBuilderEntitlement,
) {
  const message = {
    OWNER_LIFETIME_ACCESS: "Lifetime owner access",
    ALLOWED: "Allowed",
    LEGACY_PAID_PLAN_ACCESS:
      "Allowed through temporary legacy paid-plan access.",
    PREMIUM_REQUIRED:
      "AI Automation Builder is available on eligible LeadPilot AI paid plans.",
    SUBSCRIPTION_EXPIRED:
      "Your premium access has expired. Renew your plan to continue building automations.",
    PAYMENT_FAILED:
      "Your latest subscription payment was unsuccessful.",
    ACCOUNT_SUSPENDED: "This account is suspended.",
    COUNTRY_UNAVAILABLE:
      "AI Automation Builder is not available in your country.",
  }[entitlement.reason];
  return {
    status: entitlement.reason === "PREMIUM_REQUIRED" ? 402 : 403,
    body: {
      error: message,
      code: entitlement.reason,
      entitlement,
      upgradeUrl: entitlement.upgradeUrl,
    },
  };
}
