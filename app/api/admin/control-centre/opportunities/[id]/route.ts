import { NextRequest, NextResponse } from "next/server";
import { requireControlCentre, verifiedUserIds } from "@/lib/control-centre";
import { ratingSummary, sanitizeText } from "@/lib/freelancer";
import { validUuid } from "@/lib/job-opportunities";
import { sendOpportunityNotification, userDisplayNames } from "@/lib/job-opportunities-server";
import { canTransitionOpportunity, statusNotification } from "@/lib/opportunity-workflow";
import type { OpportunityStatus } from "@/types/job-opportunity";

async function load(id: string) {
  const auth = await requireControlCentre();
  if (!auth) return { response: NextResponse.json({ error: "Owner Control Centre access required." }, { status: 403 }) };
  if (!validUuid(id)) return { response: NextResponse.json({ error: "Invalid job ID." }, { status: 400 }) };
  const { data: opportunity } = await auth.admin.from("opportunities").select("*").eq("id", id).maybeSingle();
  if (!opportunity) return { response: NextResponse.json({ error: "Job request not found." }, { status: 404 }) };
  return { auth, opportunity };
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const found = await load(params.id);
  if (found.response) return found.response;
  const { auth, opportunity } = found as any;
  const clientId = opportunity.client_user_id || opportunity.owner_id;
  const [assignments, events, applications, conversations, notes, clientSummary, profiles, reviews, reports, completed] = await Promise.all([
    auth.admin.from("opportunity_assignments").select("*").eq("opportunity_id", opportunity.id).order("created_at", { ascending: false }),
    auth.admin.from("opportunity_status_events").select("*").eq("opportunity_id", opportunity.id).order("created_at", { ascending: false }),
    auth.admin.from("opportunity_applications").select("*").eq("opportunity_id", opportunity.id).order("created_at", { ascending: false }),
    auth.admin.from("opportunity_conversations").select("id,assignment_id,status,updated_at").eq("opportunity_id", opportunity.id).order("created_at", { ascending: false }),
    ["owner", "admin"].includes(auth.role) ? auth.admin.from("opportunity_owner_notes").select("notes,updated_by,updated_at").eq("opportunity_id", opportunity.id).maybeSingle() : Promise.resolve({ data: null }),
    clientId ? auth.admin.from("user_profiles").select("id,full_name,plan,is_suspended,created_at").eq("id", clientId).maybeSingle() : Promise.resolve({ data: null }),
    auth.admin.from("freelancer_profiles").select("id,user_id,username,display_name,full_name,professional_title,profile_image_url,skills,country,availability_status,portfolio_projects:freelancer_portfolio_projects(id,project_title,project_url,external_url,is_visible)").eq("profile_visibility", "public").limit(250),
    auth.admin.from("freelancer_reviews").select("freelancer_id,rating").eq("moderation_status", "approved"),
    auth.admin.from("freelancer_review_reports").select("freelancer_id,status"),
    auth.admin.from("opportunity_assignments").select("freelancer_id").eq("status", "completed"),
  ]);
  const profileRows = profiles.data || [];
  const verified = await verifiedUserIds(auth.admin, profileRows.map((row: any) => row.user_id));
  const names = await userDisplayNames(auth.admin, [opportunity.client_user_id, opportunity.owner_id, ...(assignments.data || []).flatMap((row: any) => [row.freelancer_id, row.assigned_by])]);
  return NextResponse.json({
    opportunity: { ...opportunity, private_owner_notes: notes.data?.notes || "", client_name: opportunity.managed_client_name || names.get(opportunity.client_user_id || opportunity.owner_id) },
    clientSummary: clientSummary.data || { full_name: opportunity.managed_client_name, managed: true },
    assignments: (assignments.data || []).map((row: any) => ({ ...row, freelancer_name: names.get(row.freelancer_id), assigned_by_name: names.get(row.assigned_by) })),
    events: events.data || [], applications: applications.data || [], conversations: conversations.data || [],
    freelancers: profileRows.map((profile: any) => {
      const summary = ratingSummary((reviews.data || []).filter((review: any) => review.freelancer_id === profile.id).map((review: any) => review.rating));
      return { ...profile, rating: summary.average, review_count: summary.total, is_verified: verified.has(profile.user_id), completed_jobs: (completed.data || []).filter((row: any) => row.freelancer_id === profile.user_id).length, report_count: (reports.data || []).filter((row: any) => row.freelancer_id === profile.id && ["open", "reviewing"].includes(row.status)).length };
    }),
    canAssign: auth.role === "owner" || auth.role === "admin",
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const found = await load(params.id);
  if (found.response) return found.response;
  const { auth, opportunity } = found as any;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid control action." }, { status: 400 }); }
  const action = sanitizeText(body.action, 80).toLowerCase();
  const reason = sanitizeText(body.reason, 3000);
  const privateNotes = sanitizeText(body.privateOwnerNotes, 5000);

  if (action === "edit_formatting") {
    const title = sanitizeText(body.title, 160);
    const description = sanitizeText(body.description, 12000);
    if (title.length < 5 || description.length < 30) return NextResponse.json({ error: "Keep a descriptive title and complete job description." }, { status: 400 });
    const { error } = await auth.admin.from("opportunities").update({ title, description }).eq("id", opportunity.id);
    if (error) return NextResponse.json({ error: "Could not save the formatting correction." }, { status: 400 });
    await auth.admin.from("opportunity_moderation_events").insert({ opportunity_id: opportunity.id, moderator_id: auth.user.id, action: "formatting_edit", reason: reason || "Obvious formatting corrected without changing project scope" });
    return NextResponse.json({ ok: true });
  }

  if (action === "assign") {
    if (!(["owner", "admin"].includes(auth.role))) return NextResponse.json({ error: "Only the owner or an administrator may assign workers." }, { status: 403 });
    if (!validUuid(body.freelancerId)) return NextResponse.json({ error: "Select a valid freelancer." }, { status: 400 });
    const { data, error } = await auth.admin.rpc("assign_opportunity_worker", { p_opportunity_id: opportunity.id, p_freelancer_id: body.freelancerId, p_actor_id: auth.user.id });
    if (error) return NextResponse.json({ error: /duplicate|unique/i.test(error.message) ? "This job already has an active assignment." : "The selected freelancer cannot be assigned to this job." }, { status: 409 });
    const result = Array.isArray(data) ? data[0] : data;
    const clientId = opportunity.client_user_id || opportunity.owner_id;
    await Promise.all([
      sendOpportunityNotification(auth.admin, { userId: body.freelancerId, type: "opportunity_assigned", title: "New project assignment", message: `You were assigned to ${opportunity.title}.`, entityType: "opportunity", entityId: opportunity.id, deduplicationKey: `assignment:${result?.assignment_id}:freelancer` }),
      clientId && clientId !== auth.user.id ? sendOpportunityNotification(auth.admin, { userId: clientId, type: "opportunity_assigned", title: "Worker assigned", message: `A freelancer was assigned to ${opportunity.title}.`, entityType: "opportunity", entityId: opportunity.id, deduplicationKey: `assignment:${result?.assignment_id}:client` }) : Promise.resolve(),
    ]);
    return NextResponse.json({ assignmentId: result?.assignment_id, conversationId: result?.conversation_id });
  }

  if (action === "cancel_assignment" || action === "reassign") {
    if (!(["owner", "admin"].includes(auth.role))) return NextResponse.json({ error: "Only the owner or an administrator may cancel assignments." }, { status: 403 });
    if (reason.length < 5) return NextResponse.json({ error: "Provide a clear cancellation reason." }, { status: 400 });
    const { data: assignment } = await auth.admin.from("opportunity_assignments").select("*").eq("opportunity_id", opportunity.id).in("status", ["offered", "accepted", "in_progress", "ready_for_review", "revision_requested"]).maybeSingle();
    if (!assignment) return NextResponse.json({ error: "No active assignment was found." }, { status: 409 });
    const now = new Date().toISOString();
    await auth.admin.from("opportunity_assignments").update({ status: "cancelled", cancelled_at: now, cancellation_reason: reason }).eq("id", assignment.id);
    await auth.admin.from("opportunity_conversations").update({ status: "closed" }).eq("assignment_id", assignment.id);
    await updateStatus(auth, opportunity, "awaiting_assignment", reason);
    await sendOpportunityNotification(auth.admin, { userId: assignment.freelancer_id, type: "opportunity_assignment_cancelled", title: "Assignment cancelled", message: `${opportunity.title}: ${reason}`, entityType: "opportunity", entityId: opportunity.id, deduplicationKey: `assignment-cancelled:${assignment.id}` });
    return NextResponse.json({ ok: true, readyToReassign: action === "reassign" });
  }

  if (action === "notes") {
    if (!(["owner", "admin"].includes(auth.role))) return NextResponse.json({ error: "Private owner notes require owner or administrator access." }, { status: 403 });
    await auth.admin.from("opportunity_owner_notes").upsert({ opportunity_id: opportunity.id, notes: privateNotes, updated_by: auth.user.id }, { onConflict: "opportunity_id" });
    return NextResponse.json({ ok: true });
  }
  const nextByAction: Record<string, OpportunityStatus> = {
    approve: "approved", request_changes: "changes_requested", reject: "rejected",
    open_assignment: "awaiting_assignment", cancel: "cancelled", remove: "cancelled",
    start_work: "in_progress", ready_for_review: "ready_for_review",
    request_revision: "revision_requested", complete: "completed",
  };
  const next = nextByAction[action];
  if (!next) return NextResponse.json({ error: "Unknown control action." }, { status: 400 });
  if (["request_changes", "reject", "cancel", "remove", "request_revision"].includes(action) && reason.length < 5)
    return NextResponse.json({ error: "Provide a clear reason for this action." }, { status: 400 });
  if (!canTransitionOpportunity(opportunity.status, next)) return NextResponse.json({ error: `Cannot move a job from ${opportunity.status} to ${next}.` }, { status: 409 });
  const error = await updateStatus(auth, opportunity, next, reason);
  if (error) return NextResponse.json({ error }, { status: 409 });
  return NextResponse.json({ ok: true, status: next });
}

async function updateStatus(auth: any, opportunity: any, next: OpportunityStatus, reason: string) {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status: next, moderation_reason: reason || null };
  if (next === "approved") Object.assign(patch, { approved_by: auth.user.id, approved_at: now });
  const { error } = await auth.admin.from("opportunities").update(patch).eq("id", opportunity.id).eq("status", opportunity.status);
  if (error) return "The job status changed before this action completed. Refresh and try again.";
  await auth.admin.from("opportunity_status_events").insert({ opportunity_id: opportunity.id, previous_status: opportunity.status, new_status: next, changed_by: auth.user.id, reason });
  const notice = statusNotification(next);
  const clientId = opportunity.client_user_id || opportunity.owner_id;
  if (notice && clientId && clientId !== auth.user.id) await sendOpportunityNotification(auth.admin, { userId: clientId, type: `opportunity_${next}`, title: notice.title, message: `${notice.message}${reason ? ` ${reason}` : ""}`, entityType: "opportunity", entityId: opportunity.id, deduplicationKey: `opportunity-status:${opportunity.id}:${next}:${now}` });
  return null;
}
