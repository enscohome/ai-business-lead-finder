import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getOwnerAccess } from "@/lib/owner-access";
export type CountryFeature =
  | "business_search"
  | "saved_leads"
  | "contact_export"
  | "ai_outreach"
  | "email_outreach"
  | "whatsapp_outreach"
  | "phone_outreach"
  | "freelancer_marketplace"
  | "ai_matching"
  | "verification"
  | "subscriptions"
  | "website_prompt_builder";
const columns: Record<CountryFeature, string> = {
  business_search: "business_search_enabled",
  saved_leads: "saved_leads_enabled",
  contact_export: "contact_export_enabled",
  ai_outreach: "ai_outreach_enabled",
  email_outreach: "email_outreach_enabled",
  whatsapp_outreach: "whatsapp_outreach_enabled",
  phone_outreach: "phone_outreach_enabled",
  freelancer_marketplace: "freelancer_marketplace_enabled",
  ai_matching: "ai_matching_enabled",
  verification: "verification_enabled",
  subscriptions: "subscriptions_enabled",
  website_prompt_builder: "website_prompt_builder_enabled",
};
export const NIGERIA = { code: "NG", name: "Nigeria" };
export async function enforceCountryFeature(
  supabase: any,
  user: User,
  feature: CountryFeature,
  requestedCountry?: string,
) {
  const ownerAccess = await getOwnerAccess(supabase, user.id);
  if (ownerAccess.isOwner)
    return {
      allowed: true,
      countryCode: "NG",
      migrationPending: false,
      isOwner: true,
    } as const;

  const normalized = (requestedCountry || "").trim().toLowerCase();
  if (normalized && !["ng", "nigeria"].includes(normalized))
    return denied(
      feature,
      "UNSUPPORTED_COUNTRY",
      "LeadPilot AI is currently available in Nigeria only. Regional availability requires technical and legal approval.",
    );
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("country_code,is_suspended")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.is_suspended)
    return denied(feature, "ACCOUNT_SUSPENDED", "This account is suspended.");
  if (profile?.country_code && profile.country_code !== "NG")
    return denied(
      feature,
      "COUNTRY_NOT_LAUNCHED",
      "This feature is not available in your account country yet.",
    );
  const { data, error } = await supabase
    .from("countries")
    .select("launch_status,enabled,country_features(*)")
    .eq("iso_code", "NG")
    .maybeSingle();
  if (error)
    return denied(
      feature,
      "COUNTRY_CONTROLS_NOT_CONFIGURED",
      "Regional access controls are not configured yet. Apply the reviewed Phase 0 migration before enabling this feature.",
    );
  const flags = Array.isArray(data?.country_features)
    ? data.country_features[0]
    : data?.country_features;
  if (
    !data?.enabled ||
    data.launch_status !== "approved" ||
    !flags?.[columns[feature]]
  )
    return denied(
      feature,
      "FEATURE_NOT_AVAILABLE",
      "This feature is not approved for launch in Nigeria yet.",
    );
  return { allowed: true, countryCode: "NG", migrationPending: false } as const;
}
function denied(feature: string, code: string, message: string) {
  return {
    allowed: false,
    response: NextResponse.json(
      {
        error: message,
        code,
        feature,
        country: "NG",
        availability: "coming_soon",
      },
      { status: 403 },
    ),
  } as const;
}
