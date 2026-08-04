import { NextRequest, NextResponse } from "next/server";
import { sanitizeText } from "@/lib/freelancer";
import { validUuid } from "@/lib/job-opportunities";
import {
  isOpportunityModerator,
  requireOpportunityUser,
  sendOpportunityNotification,
  userDisplayNames,
} from "@/lib/job-opportunities-server";

async function moderator() {
  const auth = await requireOpportunityUser();
  if (!auth || !(await isOpportunityModerator(auth.admin, auth.user.id))) return null;
  return auth;
}

export async function GET() {
  const auth = await moderator();
  if (!auth) return NextResponse.json({ error: "Owner or administrator access required." }, { status: 403 });
  const [pending, recent, reports, events] = await Promise.all([
    auth.admin.from("opportunities").select("*").eq("status", "pending_review").order("created_at").limit(100),
    auth.admin.from("opportunities").select("*").in("status", ["open","rejected","paused","closed","completed"]).order("updated_at", { ascending: false }).limit(50),
    auth.admin.from("community_reports").select("*").order("created_at", { ascending: false }).limit(100),
    auth.admin.from("opportunity_moderation_events").select("*").order("created_at", { ascending: false }).limit(100),
  ]);
  const all = [...(pending.data || []), ...(recent.data || [])];
  const names = await userDisplayNames(auth.admin, all.map((row: any) => row.owner_id));
  const conversationReportIds = (reports.data || []).filter((r: any) => r.entity_type === "conversation" && ["open","reviewing"].includes(r.status)).map((r: any) => r.entity_id);
  const { data: reportedMessages } = conversationReportIds.length
    ? await auth.admin.from("opportunity_messages").select("id,conversation_id,sender_id,message,created_at").in("conversation_id", conversationReportIds).order("created_at", { ascending: false }).limit(200)
    : { data: [] as any[] };
  const enrich = (row: any) => ({ ...row, poster_name: names.get(row.owner_id) });
  return NextResponse.json({
    pending: (pending.data || []).map(enrich), recent: (recent.data || []).map(enrich),
    reports: (reports.data || []).map((report: any) => ({ ...report, reported_messages: report.entity_type === "conversation" ? (reportedMessages || []).filter((message: any) => message.conversation_id === report.entity_id).slice(0, 20).reverse() : undefined })),
    events: events.data || [],
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await moderator();
  if (!auth) return NextResponse.json({ error: "Owner or administrator access required." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid moderation request." }, { status: 400 }); }
  const action = sanitizeText(body.action, 80).toLowerCase();
  const reason = sanitizeText(body.reason, 3000);
  if (action === "resolve_report" || action === "dismiss_report") {
    if (!validUuid(body.reportId)) return NextResponse.json({ error: "Invalid report ID." }, { status: 400 });
    const status = action === "dismiss_report" ? "dismissed" : "resolved";
    const { data: report, error } = await auth.admin.from("community_reports").update({ status, moderator_notes: reason || null, resolved_by: auth.user.id, resolved_at: new Date().toISOString() }).eq("id", body.reportId).select("*").maybeSingle();
    if (error || !report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    await auth.admin.from("opportunity_moderation_events").insert({ opportunity_id: report.entity_type === "opportunity" ? report.entity_id : null, report_id: report.id, moderator_id: auth.user.id, action, reason });
    return NextResponse.json({ report });
  }
  if (action === "suspend_user") {
    if (!validUuid(body.userId)) return NextResponse.json({ error: "Invalid user ID." }, { status: 400 });
    const { error } = await auth.admin.from("user_profiles").update({ is_suspended: true }).eq("id", body.userId);
    if (error) return NextResponse.json({ error: "Could not suspend the account." }, { status: 400 });
    await auth.admin.from("opportunity_moderation_events").insert({ moderator_id: auth.user.id, action, reason: reason || `Suspended user ${body.userId}` });
    return NextResponse.json({ ok: true });
  }
  if (!validUuid(body.opportunityId)) return NextResponse.json({ error: "Invalid opportunity ID." }, { status: 400 });
  const { data: opportunity } = await auth.admin.from("opportunities").select("*").eq("id", body.opportunityId).maybeSingle();
  if (!opportunity) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
  if (!["approve","reject","remove","suspend"].includes(action)) return NextResponse.json({ error: "Unknown moderation action." }, { status: 400 });
  if (["reject","suspend"].includes(action) && reason.length < 5) return NextResponse.json({ error: "Add a clear moderation reason." }, { status: 400 });
  if (action === "remove") {
    await auth.admin.from("opportunities").delete().eq("id", opportunity.id);
  } else {
    const status = action === "approve" ? "open" : action === "reject" ? "rejected" : "paused";
    await auth.admin.from("opportunities").update({ status, moderation_reason: reason || null, approved_by: action === "approve" ? auth.user.id : opportunity.approved_by, approved_at: action === "approve" ? new Date().toISOString() : opportunity.approved_at }).eq("id", opportunity.id);
  }
  await auth.admin.from("opportunity_moderation_events").insert({ opportunity_id: opportunity.id, moderator_id: auth.user.id, action, reason });
  await sendOpportunityNotification(auth.admin, {
    userId: opportunity.owner_id,
    type: action === "approve" ? "opportunity_approved" : "opportunity_rejected",
    title: action === "approve" ? "Opportunity approved" : "Opportunity moderation update",
    message: action === "approve" ? `${opportunity.title} is now visible in Job Opportunities.` : `${opportunity.title} was ${action}${reason ? `: ${reason}` : "."}`,
    entityType: "opportunity", entityId: opportunity.id,
    deduplicationKey: `opportunity-moderation:${opportunity.id}:${action}:${opportunity.updated_at}`,
  });
  return NextResponse.json({ ok: true });
}
