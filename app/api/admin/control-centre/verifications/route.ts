import { NextRequest, NextResponse } from "next/server";
import { canAssignOrVerify, requireControlCentre } from "@/lib/control-centre";
import { sanitizeText } from "@/lib/freelancer";
import { validUuid } from "@/lib/job-opportunities";
import { sendOpportunityNotification } from "@/lib/job-opportunities-server";

export async function GET(request: NextRequest) {
  const auth = await requireControlCentre();
  if (!auth) return NextResponse.json({ error: "Owner Control Centre access required." }, { status: 403 });
  const status = sanitizeText(request.nextUrl.searchParams.get("status"), 30);
  const q = sanitizeText(request.nextUrl.searchParams.get("q"), 80).toLowerCase();
  let query = auth.admin.from("verification_applications").select("*").order("updated_at", { ascending: false }).limit(200);
  if (status && status !== "all") query = query.eq("status", status);
  const { data: applications, error } = await query;
  if (error) return NextResponse.json({ error: "Verification migration has not been applied yet." }, { status: 503 });
  const userIds = (applications || []).map((row: any) => row.user_id);
  const [{ data: profiles }, { data: reviews }, { data: completed }, { data: reports }, { data: users }, { data: events }, { data: verifications }] = await Promise.all([
    userIds.length ? auth.admin.from("freelancer_profiles").select("id,user_id,username,display_name,full_name,professional_title,profile_image_url,created_at").in("user_id", userIds) : Promise.resolve({ data: [] as any[] }),
    auth.admin.from("freelancer_reviews").select("freelancer_id,rating").eq("moderation_status", "approved"),
    userIds.length ? auth.admin.from("opportunity_assignments").select("freelancer_id").in("freelancer_id", userIds).eq("status", "completed") : Promise.resolve({ data: [] as any[] }),
    auth.admin.from("freelancer_review_reports").select("freelancer_id,status"),
    userIds.length ? auth.admin.from("user_profiles").select("id,is_suspended,created_at").in("id", userIds) : Promise.resolve({ data: [] as any[] }),
    userIds.length ? auth.admin.from("verification_events").select("*").in("user_id", userIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] as any[] }),
    userIds.length ? auth.admin.from("user_verifications").select("*").in("user_id", userIds) : Promise.resolve({ data: [] as any[] }),
  ]);
  const enriched = (applications || []).map((application: any) => {
    const profile = (profiles || []).find((row: any) => row.user_id === application.user_id);
    const profileReviews = (reviews || []).filter((row: any) => row.freelancer_id === profile?.id);
    const name = profile?.display_name || profile?.full_name || application.professional_name;
    return {
      ...application,
      document_count: (application.document_references || []).length,
      document_references: undefined,
      profile,
      performance: {
        completed_jobs: (completed || []).filter((row: any) => row.freelancer_id === application.user_id).length,
        average_rating: profileReviews.length ? Math.round((profileReviews.reduce((sum: number, row: any) => sum + Number(row.rating), 0) / profileReviews.length) * 10) / 10 : 0,
        review_count: profileReviews.length,
        report_count: (reports || []).filter((row: any) => row.freelancer_id === profile?.id && ["open", "reviewing"].includes(row.status)).length,
        is_suspended: (users || []).find((row: any) => row.id === application.user_id)?.is_suspended === true,
        account_created_at: (users || []).find((row: any) => row.id === application.user_id)?.created_at || profile?.created_at,
      },
      verification: (verifications || []).find((row: any) => row.user_id === application.user_id) || null,
      history: (events || []).filter((row: any) => row.user_id === application.user_id),
      searchable_name: name,
    };
  }).filter((row: any) => !q || `${row.searchable_name} ${row.professional_category}`.toLowerCase().includes(q));
  return NextResponse.json({ applications: enriched, role: auth.role, canDecide: canAssignOrVerify(auth.role) });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireControlCentre();
  if (!auth) return NextResponse.json({ error: "Owner Control Centre access required." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid verification decision." }, { status: 400 }); }
  if (!validUuid(body.applicationId)) return NextResponse.json({ error: "Invalid application ID." }, { status: 400 });
  const action = sanitizeText(body.action, 40).toLowerCase();
  const reason = sanitizeText(body.reason, 3000);
  const privateNotes = sanitizeText(body.privateNotes, 5000);
  if (!(["under_review", "changes_requested", "approve", "reject", "revoke", "restore"].includes(action)))
    return NextResponse.json({ error: "Unknown verification action." }, { status: 400 });
  if (["approve", "revoke", "restore"].includes(action) && !canAssignOrVerify(auth.role))
    return NextResponse.json({ error: "Only the owner or an administrator may approve, revoke or restore verification." }, { status: 403 });
  if (["changes_requested", "reject", "revoke"].includes(action) && reason.length < 5)
    return NextResponse.json({ error: "Provide a clear reason for this decision." }, { status: 400 });
  const { data: application } = await auth.admin.from("verification_applications").select("*").eq("id", body.applicationId).maybeSingle();
  if (!application) return NextResponse.json({ error: "Verification application not found." }, { status: 404 });
  if (application.user_id === auth.user.id) return NextResponse.json({ error: "Reviewers cannot decide their own verification application." }, { status: 403 });
  const allowedByStatus: Record<string, string[]> = {
    pending: ["under_review", "changes_requested", "approve", "reject"],
    under_review: ["changes_requested", "approve", "reject"],
    changes_requested: ["reject"],
    approved: ["revoke"],
    rejected: [],
    revoked: ["restore"],
  };
  if (!allowedByStatus[application.status]?.includes(action))
    return NextResponse.json({ error: `The ${action.replaceAll("_", " ")} action is not valid for a ${application.status.replaceAll("_", " ")} application.` }, { status: 409 });
  const now = new Date().toISOString();
  const status = action === "approve" || action === "restore" ? "approved" : action === "reject" ? "rejected" : action;
  const { error } = await auth.admin.from("verification_applications").update({
    status, reviewed_by: auth.user.id, reviewed_at: now, moderator_notes: privateNotes,
    change_request_reason: action === "changes_requested" ? reason : null,
    rejection_reason: action === "reject" ? reason : null,
  }).eq("id", application.id);
  if (error) return NextResponse.json({ error: "Could not save the verification decision." }, { status: 409 });
  if (["approve", "restore"].includes(action)) {
    await auth.admin.from("user_verifications").upsert({ user_id: application.user_id, verification_type: "leadpilot_verified", status: "approved", verified_by: auth.user.id, verified_at: now, revoked_by: null, revoked_at: null, revocation_reason: null }, { onConflict: "user_id" });
  } else if (action === "revoke") {
    await auth.admin.from("user_verifications").upsert({ user_id: application.user_id, verification_type: "leadpilot_verified", status: "revoked", revoked_by: auth.user.id, revoked_at: now, revocation_reason: reason }, { onConflict: "user_id" });
  }
  const auditAction = action === "approve" ? "approved" : action === "reject" ? "rejected" : action === "restore" ? "restored" : action;
  await auth.admin.from("verification_events").insert({ user_id: application.user_id, application_id: application.id, moderator_id: auth.user.id, action: auditAction, reason, private_notes: privateNotes });
  const notification = {
    under_review: ["Verification under review", "LeadPilot has started reviewing your application."],
    changes_requested: ["Verification changes requested", reason], approved: ["LeadPilot Verified approved", "Your profile is now LeadPilot Verified."],
    rejected: ["Verification application rejected", reason], revoked: ["LeadPilot Verified revoked", reason], restored: ["LeadPilot Verified restored", "Your verification badge has been restored."],
  }[auditAction] || ["Verification update", reason];
  await sendOpportunityNotification(auth.admin, { userId: application.user_id, type: `verification_${auditAction}`, title: notification[0], message: notification[1], entityType: "verification_application", entityId: application.id, deduplicationKey: `verification:${application.id}:${auditAction}:${now}` });
  return NextResponse.json({ ok: true, status });
}
