import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  opportunityInputError,
  sanitizeOpportunityInput,
  validUuid,
} from "@/lib/job-opportunities";
import {
  isSuspended,
  isOpportunityModerator,
  requireOpportunityUser,
  sendOpportunityNotification,
  userDisplayNames,
} from "@/lib/job-opportunities-server";

async function findOpportunity(id: string) {
  const auth = await requireOpportunityUser();
  if (!auth) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!validUuid(id)) return { response: NextResponse.json({ error: "Invalid opportunity ID." }, { status: 400 }) };
  const { data, error } = await auth.admin.from("opportunities").select("*").eq("id", id).maybeSingle();
  if (error || !data) return { response: NextResponse.json({ error: "Opportunity not found." }, { status: 404 }) };
  return { auth, opportunity: data };
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const found = await findOpportunity(params.id);
  if (found.response) return found.response;
  const { auth, opportunity } = found as any;
  const visible = opportunity.status === "open" && opportunity.approved_at || opportunity.owner_id === auth.user.id || await isOpportunityModerator(auth.admin, auth.user.id);
  if (!visible) {
    const { data: application } = await auth.admin.from("opportunity_applications").select("id").eq("opportunity_id", opportunity.id).eq("applicant_id", auth.user.id).maybeSingle();
    if (!application) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
  }
  const [{ data: applications }, { data: saved }, { data: myApplication }, names] = await Promise.all([
    auth.admin.from("opportunity_applications").select("id,status").eq("opportunity_id", opportunity.id),
    auth.admin.from("saved_opportunities").select("opportunity_id").eq("user_id", auth.user.id).eq("opportunity_id", opportunity.id).maybeSingle(),
    auth.admin.from("opportunity_applications").select("id,status").eq("opportunity_id", opportunity.id).eq("applicant_id", auth.user.id).in("status", ["submitted","shortlisted","accepted"]).maybeSingle(),
    userDisplayNames(auth.admin, [opportunity.owner_id]),
  ]);
  return NextResponse.json({
    opportunity: {
      ...opportunity,
      poster_name: names.get(opportunity.owner_id),
      application_count: applications?.length || 0,
      shortlisted_count: (applications || []).filter((a: any) => ["shortlisted","accepted"].includes(a.status)).length,
      has_accepted: (applications || []).some((a: any) => a.status === "accepted"),
      is_saved: Boolean(saved),
      is_owner: opportunity.owner_id === auth.user.id,
    },
    myApplication,
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const found = await findOpportunity(params.id);
  if (found.response) return found.response;
  const { auth, opportunity } = found as any;
  if (opportunity.owner_id !== auth.user.id)
    return NextResponse.json({ error: "Only the job poster can update this opportunity." }, { status: 403 });
  if (await isSuspended(auth.admin, auth.user.id))
    return NextResponse.json({ error: "This account is suspended." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const action = String(body.action || "edit");
  if (action === "edit") {
    if (!["pending_review", "open", "paused"].includes(opportunity.status))
      return NextResponse.json({ error: "This opportunity can no longer be edited." }, { status: 409 });
    const input = sanitizeOpportunityInput(body);
    const validation = opportunityInputError(input);
    if (validation) return NextResponse.json({ error: validation }, { status: 400 });
    const importantEdit = opportunity.status === "open";
    const { data, error } = await auth.admin.from("opportunities").update({
      ...input,
      ...(importantEdit ? { status: "pending_review", approved_at: null, approved_by: null, moderation_reason: null } : {}),
    }).eq("id", opportunity.id).eq("owner_id", auth.user.id).select("*").single();
    if (error) return NextResponse.json({ error: "Could not update this opportunity." }, { status: 400 });
    return NextResponse.json({ opportunity: data, returnedToReview: importantEdit });
  }
  if (action === "review_request") {
    if (opportunity.status !== "completed")
      return NextResponse.json({ error: "Complete the opportunity before requesting a review." }, { status: 409 });
    const { data: accepted } = await auth.admin.from("opportunity_applications").select("applicant_id").eq("opportunity_id", opportunity.id).eq("status", "accepted").maybeSingle();
    if (!accepted) return NextResponse.json({ error: "No accepted freelancer was found." }, { status: 409 });
    const { data: freelancer } = await auth.admin.from("freelancer_profiles").select("id").eq("user_id", accepted.applicant_id).maybeSingle();
    if (!freelancer) return NextResponse.json({ error: "The freelancer profile is unavailable." }, { status: 404 });
    const { data: existing } = await auth.admin.from("freelancer_review_requests").select("unique_token").eq("opportunity_id", opportunity.id).maybeSingle();
    if (existing) return NextResponse.json({ reviewUrl: `${request.nextUrl.origin}/review/${existing.unique_token}` });
    const names = await userDisplayNames(auth.admin, [auth.user.id]);
    const token = randomBytes(32).toString("base64url");
    const { error } = await auth.admin.from("freelancer_review_requests").insert({
      freelancer_id: freelancer.id,
      client_name: names.get(auth.user.id) || "LeadPilot client",
      project_title: opportunity.title,
      unique_token: token,
      opportunity_id: opportunity.id,
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
    if (error) return NextResponse.json({ error: "Could not create the review link." }, { status: 400 });
    return NextResponse.json({ reviewUrl: `${request.nextUrl.origin}/review/${token}` });
  }
  const transitions: Record<string, string[]> = {
    pause: ["open"], close: ["open", "paused"], complete: ["open", "paused", "closed"], reopen: ["paused", "closed"],
  };
  if (!transitions[action]?.includes(opportunity.status))
    return NextResponse.json({ error: "That status change is not available." }, { status: 409 });
  const nextStatus = action === "pause" ? "paused" : action === "close" ? "closed" : action === "complete" ? "completed" : "pending_review";
  if (action === "complete") {
    const { data: accepted } = await auth.admin.from("opportunity_applications").select("applicant_id").eq("opportunity_id", opportunity.id).eq("status", "accepted").maybeSingle();
    if (!accepted) return NextResponse.json({ error: "Accept a freelancer before marking this completed." }, { status: 409 });
    await auth.admin.from("opportunity_conversations").update({ status: "closed" }).eq("opportunity_id", opportunity.id);
    await sendOpportunityNotification(auth.admin, {
      userId: accepted.applicant_id, type: "opportunity_completed", title: "Opportunity completed",
      message: `${opportunity.title} was marked completed.`, entityType: "opportunity", entityId: opportunity.id,
      deduplicationKey: `opportunity-completed:${opportunity.id}`,
    });
  }
  const { data, error } = await auth.admin.from("opportunities").update({
    status: nextStatus,
    ...(action === "reopen" ? { approved_at: null, approved_by: null, moderation_reason: null } : {}),
  }).eq("id", opportunity.id).select("*").single();
  if (error) return NextResponse.json({ error: "Could not change opportunity status." }, { status: 400 });
  return NextResponse.json({ opportunity: data });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const found = await findOpportunity(params.id);
  if (found.response) return found.response;
  const { auth, opportunity } = found as any;
  if (opportunity.owner_id !== auth.user.id)
    return NextResponse.json({ error: "Only the job poster can delete this opportunity." }, { status: 403 });
  const { error } = await auth.admin.from("opportunities").delete().eq("id", opportunity.id).eq("owner_id", auth.user.id);
  return error
    ? NextResponse.json({ error: "Could not delete this opportunity." }, { status: 400 })
    : NextResponse.json({ ok: true });
}
