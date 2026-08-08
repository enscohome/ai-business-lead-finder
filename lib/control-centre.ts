import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOpportunityUser } from "@/lib/job-opportunities-server";

export type ControlCentreRole = "owner" | "admin" | "moderator";

export async function getControlCentreRole(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<ControlCentreRole | null> {
  const { data } = await admin
    .from("app_admins")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["owner", "admin", "moderator"])
    .maybeSingle();
  return (data?.role as ControlCentreRole | undefined) || null;
}

export function canAssignOrVerify(role: ControlCentreRole | null) {
  return role === "owner" || role === "admin";
}

export async function requireControlCentre(options?: {
  ownerOrAdmin?: boolean;
}) {
  const auth = await requireOpportunityUser();
  if (!auth) return null;
  const role = await getControlCentreRole(auth.admin, auth.user.id);
  if (!role || (options?.ownerOrAdmin && !canAssignOrVerify(role))) return null;
  return { ...auth, role };
}

export async function isLeadPilotVerified(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const [{ data: owner }, { data: verification }, { data: profile }] = await Promise.all([
    admin
      .from("app_admins")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "owner")
      .maybeSingle(),
    admin
      .from("user_verifications")
      .select("status")
      .eq("user_id", userId)
      .eq("status", "approved")
      .maybeSingle(),
    admin.from("user_profiles").select("is_suspended").eq("id", userId).maybeSingle(),
  ]);
  return owner?.role === "owner" || (profile?.is_suspended !== true && verification?.status === "approved");
}

export async function verifiedUserIds(
  admin: ReturnType<typeof createAdminClient>,
  userIds: string[],
) {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (!unique.length) return new Set<string>();
  const [{ data: owners }, { data: approved }, { data: suspended }] = await Promise.all([
    admin
      .from("app_admins")
      .select("user_id")
      .in("user_id", unique)
      .eq("role", "owner"),
    admin
      .from("user_verifications")
      .select("user_id")
      .in("user_id", unique)
      .eq("status", "approved"),
    admin.from("user_profiles").select("id").in("id", unique).eq("is_suspended", true),
  ]);
  const blocked = new Set((suspended || []).map((row: any) => row.id));
  return new Set([
    ...(owners || []).map((row: any) => row.user_id),
    ...(approved || []).map((row: any) => row.user_id).filter((id: string) => !blocked.has(id)),
  ]);
}
