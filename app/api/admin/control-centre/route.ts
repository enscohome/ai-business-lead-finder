import { NextRequest, NextResponse } from "next/server";
import { requireControlCentre, verifiedUserIds } from "@/lib/control-centre";
import { databaseUnavailable, sendOpportunityNotification, userDisplayNames } from "@/lib/job-opportunities-server";
import { sanitizeText } from "@/lib/freelancer";
import { validUuid } from "@/lib/job-opportunities";

const STATUSES = [
  "pending_review", "changes_requested", "approved", "awaiting_assignment",
  "assigned", "in_progress", "ready_for_review", "completed", "rejected", "cancelled",
] as const;

export async function GET(request: NextRequest) {
  const auth = await requireControlCentre();
  if (!auth)
    return NextResponse.json({ error: "Owner Control Centre access required." }, { status: 403 });
  if (request.nextUrl.searchParams.get("view") === "access")
    return NextResponse.json({ allowed: true, role: auth.role });

  try {
    const [jobs, assignments, participantRows, messages, applications, verifications, reports, profiles, users, events] = await Promise.all([
      auth.admin.from("opportunities").select("*").order("updated_at", { ascending: false }).limit(250),
      auth.admin.from("opportunity_assignments").select("*").order("created_at", { ascending: false }).limit(250),
      auth.admin.from("opportunity_conversation_participants").select("conversation_id,last_read_at").eq("user_id", auth.user.id).eq("participant_role", "owner").is("left_at", null),
      auth.admin.from("opportunity_messages").select("conversation_id,sender_id,created_at").order("created_at", { ascending: false }).limit(1000),
      auth.admin.from("opportunity_applications").select("id,opportunity_id,applicant_id,status,created_at").eq("status", "submitted").order("created_at", { ascending: false }).limit(100),
      auth.admin.from("verification_applications").select("id,user_id,professional_name,status,created_at,updated_at").order("updated_at", { ascending: false }).limit(100),
      auth.admin.from("community_reports").select("id,entity_type,entity_id,reason,status,created_at").in("status", ["open", "reviewing"]).order("created_at", { ascending: false }).limit(100),
      auth.admin.from("freelancer_profiles").select("id,user_id,username,display_name,full_name,professional_title,profile_image_url,country,availability_status,skills,verification_status,created_at").order("created_at", { ascending: false }).limit(200),
      auth.admin.from("user_profiles").select("id,full_name,plan,is_suspended,created_at").order("created_at", { ascending: false }).limit(250),
      auth.admin.from("opportunity_status_events").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    const errors = [jobs, assignments, participantRows, messages, applications, verifications, reports, profiles, users, events].map((result) => result.error).filter(Boolean);
    if (errors.length) throw errors[0];
    const rows = jobs.data || [];
    const conversationReads = new Map((participantRows.data || []).map((row: any) => [row.conversation_id, row.last_read_at]));
    const unreadProjectMessages = (messages.data || []).filter((message: any) => {
      if (message.sender_id === auth.user.id || !conversationReads.has(message.conversation_id)) return false;
      const lastRead = conversationReads.get(message.conversation_id);
      return !lastRead || new Date(message.created_at) > new Date(lastRead);
    }).length;
    const verifiedIds = await verifiedUserIds(auth.admin, (profiles.data || []).map((row: any) => row.user_id));
    const names = await userDisplayNames(auth.admin, rows.flatMap((row: any) => [row.client_user_id, row.owner_id, row.created_by]));
    const counts = Object.fromEntries(STATUSES.map((status) => [status, rows.filter((row: any) => row.status === status).length]));
    return NextResponse.json({
      role: auth.role,
      canAssign: auth.role === "owner" || auth.role === "admin",
      counts: {
        ...counts,
        unread_project_messages: unreadProjectMessages,
        new_freelancer_applications: (applications.data || []).length,
        verification_applications: (verifications.data || []).filter((row: any) => ["pending", "under_review", "changes_requested"].includes(row.status)).length,
        reports_requiring_attention: (reports.data || []).length,
        active_verified_freelancers: Array.from(verifiedIds).filter((id) => !(users.data || []).find((row: any) => row.id === id)?.is_suspended).length,
        suspended_users: (users.data || []).filter((row: any) => row.is_suspended).length,
      },
      jobs: rows.map((row: any) => ({ ...row, client_name: row.managed_client_name || names.get(row.client_user_id || row.owner_id) })),
      assignments: assignments.data || [],
      applications: applications.data || [],
      verifications: verifications.data || [],
      reports: reports.data || [],
      freelancers: (profiles.data || []).map((row: any) => ({ ...row, is_verified: verifiedIds.has(row.user_id) })),
      users: users.data || [],
      events: events.data || [],
    });
  } catch (error) {
    return NextResponse.json({ error: databaseUnavailable(error) ? "Owner Control Centre migration has not been applied yet." : "Could not load the Owner Control Centre." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireControlCentre();
  if (!auth) return NextResponse.json({ error: "Owner Control Centre access required." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid user moderation request." }, { status: 400 }); }
  const action = sanitizeText(body.action, 40);
  const reason = sanitizeText(body.reason, 3000);
  if (!validUuid(body.userId) || !["suspend_user", "restore_user"].includes(action)) return NextResponse.json({ error: "Invalid user moderation request." }, { status: 400 });
  if (body.userId === auth.user.id) return NextResponse.json({ error: "You cannot change your own administrative account status." }, { status: 403 });
  const { data: protectedRole } = await auth.admin.from("app_admins").select("role").eq("user_id", body.userId).maybeSingle();
  if (protectedRole) return NextResponse.json({ error: "Administrative accounts require a separate authorised role-management process." }, { status: 403 });
  if (action === "suspend_user" && reason.length < 5) return NextResponse.json({ error: "Provide a clear suspension reason." }, { status: 400 });
  const suspended = action === "suspend_user";
  const now = new Date().toISOString();
  const { error } = await auth.admin.from("user_profiles").update({ is_suspended: suspended }).eq("id", body.userId);
  if (error) return NextResponse.json({ error: "Could not update this account." }, { status: 400 });
  if (suspended) {
    await auth.admin.from("freelancer_profiles").update({ profile_visibility: "private", verification_status: "suspended", suspended_at: now }).eq("user_id", body.userId);
    const { data: verification } = await auth.admin.from("user_verifications").select("status").eq("user_id", body.userId).maybeSingle();
    if (verification?.status === "approved" && ["owner", "admin"].includes(auth.role)) {
      await auth.admin.from("user_verifications").update({ status: "revoked", revoked_by: auth.user.id, revoked_at: now, revocation_reason: reason }).eq("user_id", body.userId);
      await auth.admin.from("verification_events").insert({ user_id: body.userId, application_id: null, moderator_id: auth.user.id, action: "revoked", reason, private_notes: "Verification revoked when the account was suspended." });
    }
  }
  await auth.admin.from("opportunity_moderation_events").insert({ moderator_id: auth.user.id, action, reason });
  await sendOpportunityNotification(auth.admin, { userId: body.userId, type: suspended ? "account_suspended" : "account_restored", title: suspended ? "Account suspended" : "Account restored", message: suspended ? `Your LeadPilot account was suspended.${reason ? ` Reason: ${reason}` : ""}` : "Your LeadPilot account access was restored.", entityType: "account_status", entityId: body.userId, deduplicationKey: `user-moderation:${body.userId}:${action}:${Date.now()}` });
  return NextResponse.json({ ok: true, is_suspended: suspended });
}
