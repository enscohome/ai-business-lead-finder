import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlan } from "@/lib/plans";
import { sanitizeText } from "@/lib/freelancer";

async function authorized() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("app_admins")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  return data ? { user, role: data.role } : null;
}
export async function GET() {
  if (!(await authorized()))
    return NextResponse.json(
      { error: "Administrator access required." },
      { status: 403 },
    );
  const admin = createAdminClient();
  const [profiles, applications, reviews, reports] = await Promise.all([
    admin
      .from("freelancer_profiles")
      .select(
        "id,user_id,username,display_name,full_name,professional_title,profile_image_url,verification_status,profile_visibility,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("freelancer_verification_applications")
      .select(
        "id,freelancer_id,legal_name,country,email_address,phone_number,linkedin_url,professional_evidence,application_status,submitted_at,rejection_reason",
      )
      .order("submitted_at", { ascending: false })
      .limit(100),
    admin
      .from("freelancer_reviews")
      .select(
        "id,freelancer_id,client_name,project_title,rating,review_text,moderation_status,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("freelancer_review_reports")
      .select("id,review_id,freelancer_id,reason,details,status,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  return NextResponse.json({
    profiles: profiles.data || [],
    applications: applications.data || [],
    reviews: reviews.data || [],
    reports: reports.data || [],
  });
}
export async function PATCH(request: NextRequest) {
  const auth = await authorized();
  if (!auth)
    return NextResponse.json(
      { error: "Administrator access required." },
      { status: 403 },
    );
  const admin = createAdminClient();
  const body = await request.json();
  if (body.type === "verification") {
    const statuses = ["verified", "rejected", "suspended"];
    if (!statuses.includes(body.status))
      return NextResponse.json(
        { error: "Invalid verification status." },
        { status: 400 },
      );
    const now = new Date().toISOString();
    const { error } = await admin
      .from("freelancer_profiles")
      .update({
        verification_status: body.status,
        verified_at: body.status === "verified" ? now : null,
        verified_by: auth.user.id,
        suspended_at: body.status === "suspended" ? now : null,
      })
      .eq("id", body.freelancerId);
    await admin
      .from("freelancer_verification_applications")
      .update({
        application_status:
          body.status === "verified" ? "approved" : body.status,
        reviewed_at: now,
        reviewed_by: auth.user.id,
        rejection_reason: sanitizeText(body.reason, 1000) || null,
      })
      .eq("id", body.applicationId);
    return error
      ? NextResponse.json({ error: error.message }, { status: 400 })
      : NextResponse.json({ updated: true });
  }
  if (body.type === "review") {
    const statuses = ["approved", "hidden", "removed"];
    if (!statuses.includes(body.status))
      return NextResponse.json(
        { error: "Invalid review status." },
        { status: 400 },
      );
    const now = new Date().toISOString();
    const { error } = await admin
      .from("freelancer_reviews")
      .update({
        moderation_status: body.status,
        approved_at: body.status === "approved" ? now : null,
        moderated_by: auth.user.id,
        moderation_notes: sanitizeText(body.notes, 1000),
      })
      .eq("id", body.reviewId);
    return error
      ? NextResponse.json({ error: error.message }, { status: 400 })
      : NextResponse.json({ updated: true });
  }
  if (body.type === "suspend_profile") {
    const free = getPlan("free");
    await admin
      .from("user_profiles")
      .update({
        plan: "free",
        searches_limit: free.searchesPerMonth,
        leads_limit: free.savedLeads,
      })
      .eq("id", body.userId);
    const { error } = await admin
      .from("freelancer_profiles")
      .update({
        profile_visibility: "private",
        verification_status: "suspended",
        suspended_at: new Date().toISOString(),
      })
      .eq("id", body.freelancerId);
    return error
      ? NextResponse.json({ error: error.message }, { status: 400 })
      : NextResponse.json({ updated: true });
  }
  return NextResponse.json(
    { error: "Unknown moderation action." },
    { status: 400 },
  );
}
