import { NextRequest, NextResponse } from "next/server";
import { sanitizeText } from "@/lib/freelancer";
import { validUuid } from "@/lib/job-opportunities";
import { requireOpportunityUser, sendOpportunityNotification, userDisplayNames } from "@/lib/job-opportunities-server";
import { canTransitionOpportunity, statusNotification } from "@/lib/opportunity-workflow";
import { verifiedUserIds } from "@/lib/control-centre";
import type { OpportunityStatus } from "@/types/job-opportunity";

async function projectForUser(id: string) {
  const auth = await requireOpportunityUser();
  if (!auth) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!validUuid(id)) return { response: NextResponse.json({ error: "Invalid job ID." }, { status: 400 }) };
  const { data: opportunity } = await auth.admin.from("opportunities").select("*").eq("id", id).maybeSingle();
  if (!opportunity) return { response: NextResponse.json({ error: "Project not found." }, { status: 404 }) };
  const { data: assignment } = await auth.admin.from("opportunity_assignments").select("*").eq("opportunity_id", id).neq("status", "cancelled").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: conversation } = await auth.admin.from("opportunity_conversations").select("*").eq("opportunity_id", id).eq("assignment_id", assignment?.id || "00000000-0000-0000-0000-000000000000").maybeSingle();
  const { data: participant } = conversation ? await auth.admin.from("opportunity_conversation_participants").select("*").eq("conversation_id", conversation.id).eq("user_id", auth.user.id).is("left_at", null).maybeSingle() : { data: null };
  const isClient = [opportunity.client_user_id, opportunity.owner_id].includes(auth.user.id);
  const isFreelancer = assignment?.freelancer_id === auth.user.id;
  if (!participant && !isClient && !isFreelancer) return { response: NextResponse.json({ error: "Project not found." }, { status: 404 }) };
  return { auth, opportunity, assignment, conversation, participant, role: participant?.participant_role || (isClient ? "client" : "freelancer") };
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const found = await projectForUser(params.id);
  if (found.response) return found.response;
  const { auth, opportunity, assignment, conversation, role } = found as any;
  const [events, assignments, participants] = await Promise.all([
    auth.admin.from("opportunity_status_events").select("*").eq("opportunity_id", opportunity.id).order("created_at", { ascending: false }),
    auth.admin.from("opportunity_assignments").select("*").eq("opportunity_id", opportunity.id).order("created_at", { ascending: false }),
    conversation ? auth.admin.from("opportunity_conversation_participants").select("user_id,participant_role,joined_at,left_at").eq("conversation_id", conversation.id) : Promise.resolve({ data: [] as any[] }),
  ]);
  const userIds = (participants.data || []).map((row: any) => row.user_id);
  const [names, verified] = await Promise.all([userDisplayNames(auth.admin, userIds), verifiedUserIds(auth.admin, userIds)]);
  return NextResponse.json({
    opportunity, assignment, assignments: assignments.data || [], events: events.data || [], conversation,
    role, currentUserId: auth.user.id,
    participants: (participants.data || []).map((row: any) => ({ ...row, display_name: names.get(row.user_id), is_verified: verified.has(row.user_id) })),
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const found = await projectForUser(params.id);
  if (found.response) return found.response;
  const { auth, opportunity, assignment, conversation, role } = found as any;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid project action." }, { status: 400 }); }
  const action = sanitizeText(body.action, 60).toLowerCase();
  const reason = sanitizeText(body.reason, 3000);
  if (!assignment) return NextResponse.json({ error: "This project has no active assignment." }, { status: 409 });

  if (action === "accept_assignment") {
    if (role !== "freelancer" || assignment.freelancer_id !== auth.user.id || assignment.status !== "offered") return NextResponse.json({ error: "Only the assigned freelancer can accept this offer." }, { status: 403 });
    await auth.admin.from("opportunity_assignments").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", assignment.id).eq("status", "offered");
    return NextResponse.json({ ok: true });
  }
  if (action === "request_update") {
    if (role !== "owner") return NextResponse.json({ error: "Only the LeadPilot project manager may request an update." }, { status: 403 });
    await sendOpportunityNotification(auth.admin, { userId: assignment.freelancer_id, type: "opportunity_update_requested", title: "Project update requested", message: `${opportunity.title}: ${reason || "Please share a progress update in the project room."}`, entityType: "opportunity_conversation", entityId: conversation.id, deduplicationKey: `project-update:${opportunity.id}:${Date.now()}` });
    return NextResponse.json({ ok: true });
  }
  const rules: Record<string, { roles: string[]; next: OpportunityStatus; assignment: string }> = {
    start_work: { roles: ["freelancer", "owner"], next: "in_progress", assignment: "in_progress" },
    ready_for_review: { roles: ["freelancer", "owner"], next: "ready_for_review", assignment: "ready_for_review" },
    request_revision: { roles: ["client", "owner"], next: "revision_requested", assignment: "revision_requested" },
    respond_revision: { roles: ["freelancer"], next: "in_progress", assignment: "in_progress" },
    confirm_completion: { roles: ["client", "owner"], next: "completed", assignment: "completed" },
    complete: { roles: ["owner"], next: "completed", assignment: "completed" },
    cancel: { roles: ["owner"], next: "cancelled", assignment: "cancelled" },
  };
  const rule = rules[action];
  if (!rule || !rule.roles.includes(role)) return NextResponse.json({ error: "This project action is not available to your role." }, { status: 403 });
  if (["request_revision", "cancel"].includes(action) && reason.length < 5) return NextResponse.json({ error: "Provide a clear reason." }, { status: 400 });
  if (action === "start_work" && role === "freelancer" && assignment.status !== "accepted") return NextResponse.json({ error: "Accept the assignment before starting work." }, { status: 409 });
  if (!canTransitionOpportunity(opportunity.status, rule.next)) return NextResponse.json({ error: `Cannot move this project from ${opportunity.status} to ${rule.next}.` }, { status: 409 });
  const now = new Date().toISOString();
  const assignmentPatch: Record<string, unknown> = { status: rule.assignment };
  if (rule.next === "in_progress") assignmentPatch.started_at = now;
  if (rule.next === "ready_for_review") assignmentPatch.ready_for_review_at = now;
  if (rule.next === "completed") assignmentPatch.completed_at = now;
  if (rule.next === "cancelled") Object.assign(assignmentPatch, { cancelled_at: now, cancellation_reason: reason });
  const { error } = await auth.admin.from("opportunities").update({ status: rule.next, moderation_reason: reason || null }).eq("id", opportunity.id).eq("status", opportunity.status);
  if (error) return NextResponse.json({ error: "The project changed before this action completed. Refresh and retry." }, { status: 409 });
  await Promise.all([
    auth.admin.from("opportunity_assignments").update(assignmentPatch).eq("id", assignment.id),
    auth.admin.from("opportunity_status_events").insert({ opportunity_id: opportunity.id, previous_status: opportunity.status, new_status: rule.next, changed_by: auth.user.id, reason }),
    rule.next === "completed" || rule.next === "cancelled" ? auth.admin.from("opportunity_conversations").update({ status: "closed" }).eq("id", conversation.id) : Promise.resolve(),
  ]);
  const notice = statusNotification(rule.next);
  const recipients = Array.from(new Set([opportunity.client_user_id || opportunity.owner_id, assignment.freelancer_id])).filter((id) => id && id !== auth.user.id);
  if (notice) await Promise.all(recipients.map((userId) => sendOpportunityNotification(auth.admin, { userId, type: `opportunity_${rule.next}`, title: notice.title, message: `${notice.message}${reason ? ` ${reason}` : ""}`, entityType: "opportunity", entityId: opportunity.id, deduplicationKey: `project-status:${opportunity.id}:${rule.next}:${now}:${userId}` })));
  return NextResponse.json({ ok: true, status: rule.next });
}
