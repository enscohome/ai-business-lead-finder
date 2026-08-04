import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requireOpportunityUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { user, supabase, admin: createAdminClient() };
}

export async function isSuspended(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await admin
    .from("user_profiles")
    .select("is_suspended")
    .eq("id", userId)
    .maybeSingle();
  return data?.is_suspended === true;
}

export async function isOpportunityModerator(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const { data } = await admin
    .from("app_admins")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["owner", "admin", "moderator"])
    .maybeSingle();
  return Boolean(data);
}

export async function sendOpportunityNotification(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    userId: string;
    type: string;
    title: string;
    message: string;
    entityType: string;
    entityId: string;
    deduplicationKey: string;
  },
) {
  await admin.from("notifications").insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      related_entity_type: input.entityType,
      related_entity_id: input.entityId,
      deduplication_key: input.deduplicationKey,
    });
}

export async function userDisplayNames(
  admin: ReturnType<typeof createAdminClient>,
  userIds: string[],
) {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (!unique.length) return new Map<string, string>();
  const [{ data: profiles }, { data: freelancers }] = await Promise.all([
    admin.from("user_profiles").select("id,full_name").in("id", unique),
    admin
      .from("freelancer_profiles")
      .select("user_id,display_name,full_name")
      .in("user_id", unique),
  ]);
  const names = new Map<string, string>();
  for (const row of profiles || [])
    if (row.full_name) names.set(row.id, row.full_name);
  for (const row of freelancers || [])
    names.set(
      row.user_id,
      row.display_name || row.full_name || names.get(row.user_id) || "LeadPilot member",
    );
  unique.forEach((id) => {
    if (!names.has(id)) names.set(id, "LeadPilot member");
  });
  return names;
}

export function databaseUnavailable(error: unknown) {
  const message = String((error as { message?: string })?.message || error || "");
  return /does not exist|schema cache|relation|column/i.test(message);
}
