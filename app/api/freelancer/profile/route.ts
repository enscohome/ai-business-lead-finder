import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  calculateProfileCompletion,
  DEFAULT_VISIBILITY,
  mapProfile,
  safeExternalUrl,
  sanitizeText,
  SOCIAL_PLATFORMS,
  validateUsername,
} from "@/lib/freelancer";

const arrays = (value: unknown, max = 30) =>
  Array.isArray(value)
    ? value
        .map((item) => sanitizeText(item, 80))
        .filter(Boolean)
        .slice(0, max)
    : [];
const timeline = (value: unknown, max: number) =>
  Array.isArray(value)
    ? value.slice(0, max).map((item) =>
        Object.fromEntries(
          Object.entries(typeof item === "object" && item ? item : {})
            .slice(0, 12)
            .map(([key, val]) => [
              sanitizeText(key, 40),
              sanitizeText(
                val,
                key.toLowerCase().includes("description") ? 2000 : 300,
              ),
            ]),
        ),
      )
    : [];

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: row, error } = await supabase
    .from("freelancer_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { error: "Freelancer profiles are not configured yet." },
      { status: 503 },
    );
  if (!row)
    return NextResponse.json({ profile: null, socialLinks: [], portfolio: [] });
  const [{ data: privateData }, { data: socialLinks }, { data: portfolio }] =
    await Promise.all([
      supabase
        .from("freelancer_private_details")
        .select("*")
        .eq("freelancer_id", row.id)
        .maybeSingle(),
      supabase
        .from("freelancer_social_links")
        .select("*")
        .eq("freelancer_id", row.id)
        .order("platform"),
      supabase
        .from("freelancer_portfolio_projects")
        .select("*")
        .eq("freelancer_id", row.id)
        .order("display_order"),
    ]);
  const profile = mapProfile({
    ...row,
    contact_email: privateData?.contact_email,
    contact_phone: privateData?.contact_phone,
  });
  return NextResponse.json({
    profile,
    socialLinks: socialLinks || [],
    portfolio: portfolio || [],
  });
}

export async function PUT(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const username = sanitizeText(body.username, 30).toLowerCase();
    const usernameError = validateUsername(username);
    if (usernameError)
      return NextResponse.json({ error: usernameError }, { status: 400 });
    const { data: existing } = await supabase
      .from("freelancer_profiles")
      .select("id,username")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing && existing.username !== username) {
      const { data: privateRow } = await supabase
        .from("freelancer_private_details")
        .select("username_changed_at,username_change_count")
        .eq("freelancer_id", existing.id)
        .maybeSingle();
      if (
        (privateRow?.username_change_count || 0) >= 3 ||
        (privateRow?.username_changed_at &&
          Date.now() - new Date(privateRow.username_changed_at).getTime() <
            30 * 86400000)
      )
        return NextResponse.json(
          {
            error:
              "Usernames can only be changed once every 30 days and up to three times.",
          },
          { status: 409 },
        );
    }
    const visibility = { ...DEFAULT_VISIBILITY, ...(body.visibility || {}) };
    const draft = {
      profileImageUrl: body.profileImageUrl,
      professionalTitle: body.professionalTitle,
      fullBio: body.fullBio,
      skills: arrays(body.skills),
      services: arrays(body.services),
      country: body.country,
      city: body.city,
      preferredContactMethod: body.preferredContactMethod,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
    };
    const socialInput = Array.isArray(body.socialLinks)
      ? body.socialLinks.slice(0, SOCIAL_PLATFORMS.length)
      : [];
    const socialLinks = socialInput
      .map((link: any) => ({
        platform: sanitizeText(link.platform, 30),
        profile_url: safeExternalUrl(
          String(link.profileUrl || link.profile_url || ""),
          link.platform,
        ),
        is_visible: link.isVisible !== false,
      }))
      .filter(
        (link: any) =>
          SOCIAL_PLATFORMS.includes(link.platform) && link.profile_url,
      );
    const portfolioCount = existing
      ? (
          await supabase
            .from("freelancer_portfolio_projects")
            .select("id", { count: "exact", head: true })
            .eq("freelancer_id", existing.id)
        ).count || 0
      : 0;
    const completion = calculateProfileCompletion(
      draft,
      portfolioCount,
      socialLinks.length,
    );
    const payload = {
      user_id: user.id,
      username,
      full_name: sanitizeText(body.fullName, 120),
      display_name: sanitizeText(body.displayName, 120),
      professional_title: sanitizeText(body.professionalTitle, 160),
      profile_image_url:
        safeExternalUrl(String(body.profileImageUrl || "")) || null,
      cover_image_url:
        safeExternalUrl(String(body.coverImageUrl || "")) || null,
      short_bio: sanitizeText(body.shortBio, 300),
      full_bio: sanitizeText(body.fullBio, 5000),
      country: sanitizeText(body.country, 80),
      city: sanitizeText(body.city, 100),
      languages: arrays(body.languages),
      skills: arrays(body.skills),
      services: arrays(body.services),
      industries: arrays(body.industries),
      years_of_experience:
        body.yearsOfExperience === ""
          ? null
          : Math.max(0, Math.min(80, Number(body.yearsOfExperience) || 0)),
      hourly_rate: body.hourlyRate
        ? Math.max(0, Number(body.hourlyRate))
        : null,
      starting_price: body.startingPrice
        ? Math.max(0, Number(body.startingPrice))
        : null,
      currency: "NGN",
      availability_status: ["available", "limited", "unavailable"].includes(
        body.availabilityStatus,
      )
        ? body.availabilityStatus
        : "available",
      preferred_contact_method: [
        "email",
        "phone",
        "whatsapp",
        "website",
      ].includes(body.preferredContactMethod)
        ? body.preferredContactMethod
        : "email",
      profile_visibility:
        body.profileVisibility === "private" ? "private" : "public",
      visibility_settings: visibility,
      work_experience: timeline(body.workExperience, 20),
      education: timeline(body.education, 20),
      certifications: timeline(body.certifications, 30),
      profile_completion_percentage: completion,
    };
    const result = existing
      ? await supabase
          .from("freelancer_profiles")
          .update(payload)
          .eq("id", existing.id)
          .select("*")
          .single()
      : await supabase
          .from("freelancer_profiles")
          .insert(payload)
          .select("*")
          .single();
    if (result.error)
      return NextResponse.json(
        {
          error:
            result.error.code === "23505"
              ? "That username is already taken."
              : result.error.message,
        },
        { status: result.error.code === "23505" ? 409 : 400 },
      );
    const profileId = result.data.id;
    if (existing && existing.username !== username)
      await supabase
        .from("freelancer_username_history")
        .insert({ freelancer_id: profileId, old_username: existing.username });
    const { data: privateExisting } = await supabase
      .from("freelancer_private_details")
      .select("username_change_count")
      .eq("freelancer_id", profileId)
      .maybeSingle();
    await supabase
      .from("freelancer_private_details")
      .upsert({
        freelancer_id: profileId,
        contact_email: sanitizeText(body.contactEmail, 254),
        contact_phone: sanitizeText(body.contactPhone, 40),
        ...(existing && existing.username !== username
          ? {
              username_changed_at: new Date().toISOString(),
              username_change_count:
                (privateExisting?.username_change_count || 0) + 1,
            }
          : {}),
      });
    await supabase
      .from("freelancer_social_links")
      .delete()
      .eq("freelancer_id", profileId);
    if (socialLinks.length)
      await supabase
        .from("freelancer_social_links")
        .insert(
          socialLinks.map((link: any) => ({
            ...link,
            freelancer_id: profileId,
          })),
        );
    return NextResponse.json({
      profile: mapProfile({
        ...result.data,
        contact_email: body.contactEmail,
        contact_phone: body.contactPhone,
      }),
      completion,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not save your profile." },
      { status: 500 },
    );
  }
}
