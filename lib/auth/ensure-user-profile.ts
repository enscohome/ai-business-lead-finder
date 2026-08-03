import type { SupabaseClient, User } from "@supabase/supabase-js";

function getProfileName(user: User): string | null {
  const metadataName = user.user_metadata?.full_name ?? user.user_metadata?.name;
  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }
  return user.email?.split("@")[0] ?? null;
}

function getAvatarUrl(user: User): string | null {
  const metadataAvatar =
    user.user_metadata?.avatar_url ?? user.user_metadata?.picture;
  return typeof metadataAvatar === "string" && metadataAvatar.trim()
    ? metadataAvatar.trim()
    : null;
}

/**
 * Creates only a missing base profile. Existing owner, paid-plan, subscription,
 * usage, suspension, and user data are deliberately never updated here.
 */
export async function ensureUserProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<void> {
  const { data: existingProfile, error: lookupError } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existingProfile) return;

  const email = user.email?.trim();
  if (!email) {
    throw new Error("Authenticated user is missing a usable email address.");
  }

  const { error: insertError } = await supabase.from("user_profiles").insert({
    id: user.id,
    email,
    full_name: getProfileName(user),
    avatar_url: getAvatarUrl(user),
  });

  // A parallel request may create the same row between lookup and insert.
  if (insertError && insertError.code !== "23505") throw insertError;
}
