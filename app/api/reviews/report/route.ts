import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeText } from "@/lib/freelancer";
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const reasons = [
    "abuse",
    "spam",
    "false_information",
    "offensive_language",
    "not_real_work",
  ];
  if (!reasons.includes(body.reason))
    return NextResponse.json(
      { error: "Choose a report reason." },
      { status: 400 },
    );
  const { data: profile } = await supabase
    .from("freelancer_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile)
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  const { error } = await supabase
    .from("freelancer_review_reports")
    .insert({
      review_id: body.reviewId,
      freelancer_id: profile.id,
      reason: body.reason,
      details: sanitizeText(body.details, 1000),
    });
  return error
    ? NextResponse.json(
        {
          error:
            error.code === "23505"
              ? "You already reported this review."
              : error.message,
        },
        { status: 400 },
      )
    : NextResponse.json({ reported: true });
}
