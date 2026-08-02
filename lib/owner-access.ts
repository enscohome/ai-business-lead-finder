import "server-only";

export const OWNER_ACCOUNT_ACCESS = Object.freeze({
  accountType: "LeadPilot Owner",
  access: "Lifetime",
  usage: "Unlimited",
  renewalDate: "Not required",
});

export interface OwnerAccessResult {
  isOwner: boolean;
  accountType: string;
  access: string;
  usage: string;
  renewalDate: string;
}

const STANDARD_ACCOUNT_ACCESS: OwnerAccessResult = {
  isOwner: false,
  accountType: "LeadPilot Account",
  access: "Plan based",
  usage: "Plan limits apply",
  renewalDate: "Based on subscription",
};

/**
 * Server-only owner entitlement check. The authenticated user id must come from
 * Supabase Auth; no email address or client-provided role is trusted.
 */
export async function getOwnerAccess(
  supabase: any,
  authenticatedUserId: string | null | undefined,
): Promise<OwnerAccessResult> {
  if (!authenticatedUserId) return STANDARD_ACCOUNT_ACCESS;

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "is_leadpilot_owner",
    { p_user_id: authenticatedUserId },
  );
  if (!rpcError)
    return rpcResult === true
      ? { isOwner: true, ...OWNER_ACCOUNT_ACCESS }
      : STANDARD_ACCOUNT_ACCESS;

  // Transitional fallback until the owner-access migration is applied. RLS on
  // app_admins still controls ordinary authenticated queries.
  const { data, error } = await supabase
    .from("app_admins")
    .select("role")
    .eq("user_id", authenticatedUserId)
    .eq("role", "owner")
    .maybeSingle();

  if (error || data?.role !== "owner") return STANDARD_ACCOUNT_ACCESS;
  return { isOwner: true, ...OWNER_ACCOUNT_ACCESS };
}
