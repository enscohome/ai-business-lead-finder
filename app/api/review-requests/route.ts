import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeText } from "@/lib/freelancer";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase
    .from("freelancer_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ requests: [], reviews: [] });
  const [{ data: requests, error }, { data: reviews }] = await Promise.all([
    supabase
      .from("freelancer_review_requests")
      .select(
        "id,client_name,project_title,unique_token,status,created_at,expires_at,completed_at",
      )
      .eq("freelancer_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("freelancer_reviews")
      .select(
        "id,client_name,client_company,project_title,rating,review_text,verification_status,moderation_status,created_at",
      )
      .eq("freelancer_id", profile.id)
      .order("created_at", { ascending: false }),
  ]);
  if (error)
    return NextResponse.json(
      { error: "Client reviews are not configured yet." },
      { status: 503 },
    );
  return NextResponse.json({
    requests: requests || [],
    reviews: reviews || [],
  });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const clientName = sanitizeText(body.clientName, 120);
  const clientEmail = sanitizeText(body.clientEmail, 254);
  const projectTitle = sanitizeText(body.projectTitle, 160);
  if (
    !clientName ||
    !projectTitle ||
    (clientEmail && !/^\S+@\S+\.\S+$/.test(clientEmail))
  )
    return NextResponse.json(
      {
        error:
          "Enter a client name, project title, and a valid optional email.",
      },
      { status: 400 },
    );
  if (clientEmail && clientEmail.toLowerCase() === user.email?.toLowerCase())
    return NextResponse.json(
      { error: "You cannot request a review from your own account email." },
      { status: 400 },
    );
  const { data: profile } = await supabase
    .from("freelancer_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile)
    return NextResponse.json(
      { error: "Create your freelancer profile first." },
      { status: 400 },
    );
  const since = new Date(Date.now() - 86400000).toISOString();
  const { count } = await supabase
    .from("freelancer_review_requests")
    .select("id", { count: "exact", head: true })
    .eq("freelancer_id", profile.id)
    .gte("created_at", since);
  if ((count || 0) >= 20)
    return NextResponse.json(
      { error: "Daily review-request limit reached. Try again tomorrow." },
      { status: 429 },
    );
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
  const { data, error } = await supabase
    .from("freelancer_review_requests")
    .insert({
      freelancer_id: profile.id,
      client_name: clientName,
      client_email: clientEmail || null,
      project_title: projectTitle,
      unique_token: token,
      expires_at: expiresAt,
    })
    .select("id,status,created_at,expires_at")
    .single();
  if (error)
    return NextResponse.json(
      { error: "Could not create the review request." },
      { status: 400 },
    );
  return NextResponse.json({
    request: data,
    reviewUrl: `${request.nextUrl.origin}/review/${token}`,
  });
}
