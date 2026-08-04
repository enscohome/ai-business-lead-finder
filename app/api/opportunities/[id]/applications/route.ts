import { NextRequest, NextResponse } from "next/server";
import {
  applicationInputError,
  rateLimitWindow,
  sanitizeApplicationInput,
  validUuid,
} from "@/lib/job-opportunities";
import {
  isSuspended,
  requireOpportunityUser,
} from "@/lib/job-opportunities-server";
import { ratingSummary } from "@/lib/freelancer";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireOpportunityUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!validUuid(params.id)) return NextResponse.json({ error: "Invalid opportunity ID." }, { status: 400 });
  const { data: opportunity } = await auth.admin.from("opportunities").select("id,owner_id,title,status").eq("id", params.id).maybeSingle();
  if (!opportunity || opportunity.owner_id !== auth.user.id)
    return NextResponse.json({ error: "Only the job poster can view applicants." }, { status: 403 });
  const { data, error } = await auth.admin.from("opportunity_applications").select("*").eq("opportunity_id", params.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load applicants." }, { status: 400 });
  const userIds = (data || []).map((row: any) => row.applicant_id);
  const { data: profiles } = userIds.length
    ? await auth.admin.from("freelancer_profiles").select("id,user_id,username,display_name,full_name,professional_title,profile_image_url,skills,verification_status").in("user_id", userIds)
    : { data: [] as any[] };
  const profileIds = (profiles || []).map((p: any) => p.id);
  const [{ data: reviews }, { data: portfolio }, { data: conversations }] = await Promise.all([
    profileIds.length ? auth.admin.from("freelancer_reviews").select("freelancer_id,rating").in("freelancer_id", profileIds).eq("moderation_status", "approved") : Promise.resolve({ data: [] as any[] }),
    profileIds.length ? auth.admin.from("freelancer_portfolio_projects").select("id,freelancer_id,project_title,cover_image_url,category").in("freelancer_id", profileIds).eq("is_visible", true).order("display_order").limit(100) : Promise.resolve({ data: [] as any[] }),
    auth.admin.from("opportunity_conversations").select("id,application_id").eq("opportunity_id", params.id),
  ]);
  return NextResponse.json({
    opportunity,
    applications: (data || []).map((application: any) => {
      const freelancer = (profiles || []).find((p: any) => p.user_id === application.applicant_id);
      const summary = ratingSummary((reviews || []).filter((r: any) => r.freelancer_id === freelancer?.id).map((r: any) => r.rating));
      return {
        ...application,
        freelancer: freelancer ? { ...freelancer, rating: summary.average, review_count: summary.total, portfolio: (portfolio || []).filter((p: any) => p.freelancer_id === freelancer.id).slice(0, 3) } : null,
        conversation_id: (conversations || []).find((c: any) => c.application_id === application.id)?.id || null,
      };
    }),
  });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireOpportunityUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!validUuid(params.id)) return NextResponse.json({ error: "Invalid opportunity ID." }, { status: 400 });
  if (await isSuspended(auth.admin, auth.user.id))
    return NextResponse.json({ error: "This account is suspended." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid application data." }, { status: 400 }); }
  const input = sanitizeApplicationInput(body);
  const validation = applicationInputError(input);
  if (validation) return NextResponse.json({ error: validation }, { status: 400 });
  const [{ data: opportunity }, { data: profile }] = await Promise.all([
    auth.admin.from("opportunities").select("id,owner_id,status,approved_at,application_deadline,application_questions").eq("id", params.id).maybeSingle(),
    auth.admin.from("freelancer_profiles").select("id").eq("user_id", auth.user.id).maybeSingle(),
  ]);
  if (!profile) return NextResponse.json({ error: "Create your freelancer profile before applying." }, { status: 403 });
  if (!opportunity || opportunity.status !== "open" || !opportunity.approved_at)
    return NextResponse.json({ error: "This opportunity is not accepting applications." }, { status: 409 });
  if (opportunity.owner_id === auth.user.id)
    return NextResponse.json({ error: "You cannot apply to your own opportunity." }, { status: 409 });
  if (opportunity.application_deadline && new Date(opportunity.application_deadline) <= new Date())
    return NextResponse.json({ error: "The application deadline has passed." }, { status: 409 });
  if ((opportunity.application_questions || []).length && input.answers.length !== opportunity.application_questions.length)
    return NextResponse.json({ error: "Answer each question from the job poster." }, { status: 400 });
  const [{ data: duplicate }, { count }] = await Promise.all([
    auth.admin.from("opportunity_applications").select("id").eq("opportunity_id", params.id).eq("applicant_id", auth.user.id).in("status", ["submitted","shortlisted","accepted"]).maybeSingle(),
    auth.admin.from("opportunity_applications").select("id", { count: "exact", head: true }).eq("applicant_id", auth.user.id).gte("created_at", rateLimitWindow()),
  ]);
  if (duplicate) return NextResponse.json({ error: "You already have an active application for this opportunity." }, { status: 409 });
  if ((count || 0) >= 30) return NextResponse.json({ error: "Daily application limit reached." }, { status: 429 });
  const { data, error } = await auth.admin.from("opportunity_applications").insert({
    ...input, opportunity_id: params.id, applicant_id: auth.user.id, status: "submitted",
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "You already have an active application." : "Could not submit this application." }, { status: error.code === "23505" ? 409 : 400 });
  return NextResponse.json({ application: data }, { status: 201 });
}
