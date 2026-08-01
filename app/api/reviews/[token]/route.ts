import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sanitizeText } from "@/lib/freelancer";

async function requestRecord(token: string) {
  return createAdminClient()
    .from("freelancer_review_requests")
    .select(
      "*, freelancer:freelancer_profiles(id,user_id,display_name,full_name,profile_image_url,professional_title)",
    )
    .eq("unique_token", token)
    .maybeSingle();
}
export async function GET(
  _: NextRequest,
  { params }: { params: { token: string } },
) {
  const { data, error } = await requestRecord(params.token);
  if (error || !data)
    return NextResponse.json(
      { error: "This review link is invalid." },
      { status: 404 },
    );
  const expired = new Date(data.expires_at) <= new Date();
  return NextResponse.json({
    request: {
      clientName: data.client_name,
      projectTitle: data.project_title,
      status: expired && data.status === "pending" ? "expired" : data.status,
      expiresAt: data.expires_at,
    },
    freelancer: {
      name: data.freelancer.display_name || data.freelancer.full_name,
      profileImageUrl: data.freelancer.profile_image_url,
      professionalTitle: data.freelancer.professional_title,
    },
  });
}
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  const admin = createAdminClient();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex");
  const since = new Date(Date.now() - 3600000).toISOString();
  const { count } = await admin
    .from("freelancer_security_events")
    .select("id", { count: "exact", head: true })
    .eq("event_key", "review_submit")
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if ((count || 0) >= 5)
    return NextResponse.json(
      { error: "Too many review attempts. Please try again later." },
      { status: 429 },
    );
  await admin
    .from("freelancer_security_events")
    .insert({
      event_key: "review_submit",
      subject: params.token.slice(0, 12),
      ip_hash: ipHash,
    });
  const { data: record } = await requestRecord(params.token);
  if (
    !record ||
    record.status !== "pending" ||
    new Date(record.expires_at) <= new Date()
  )
    return NextResponse.json(
      { error: "This review link has expired or has already been used." },
      { status: 410 },
    );
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === record.freelancer.user_id)
    return NextResponse.json(
      { error: "Freelancers cannot review themselves." },
      { status: 403 },
    );
  const body = await request.json();
  const rating = Number(body.rating);
  const clientName = sanitizeText(body.clientName, 120);
  const company = sanitizeText(body.clientCompany, 120);
  const reviewText = sanitizeText(body.reviewText, 3000);
  if (
    !body.honest ||
    rating < 1 ||
    rating > 5 ||
    !clientName ||
    reviewText.length < 20
  )
    return NextResponse.json(
      {
        error:
          "Choose a rating, write at least 20 characters, and confirm the honest-review statement.",
      },
      { status: 400 },
    );
  const { error } = await admin
    .from("freelancer_reviews")
    .insert({
      review_request_id: record.id,
      freelancer_id: record.freelancer_id,
      client_name: clientName,
      client_company: company || null,
      project_title: record.project_title,
      rating,
      review_text: reviewText,
      moderation_status: "pending",
    });
  if (error)
    return NextResponse.json(
      { error: "This review could not be submitted." },
      { status: error.code === "23505" ? 409 : 400 },
    );
  await admin
    .from("freelancer_review_requests")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", record.id)
    .eq("status", "pending");
  return NextResponse.json({
    submitted: true,
    message:
      "Thank you. Your verified client review has been submitted for moderation.",
  });
}
