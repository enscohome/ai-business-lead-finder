import { NextRequest, NextResponse } from "next/server";
import { sanitizeText } from "@/lib/freelancer";
import { validUuid } from "@/lib/job-opportunities";
import {
  requireOpportunityUser,
  sendOpportunityNotification,
} from "@/lib/job-opportunities-server";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireOpportunityUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!validUuid(params.id)) return NextResponse.json({ error: "Invalid application ID." }, { status: 400 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const nextStatus = sanitizeText(body.status, 20).toLowerCase();
  const { data: application } = await auth.admin.from("opportunity_applications").select("*").eq("id", params.id).maybeSingle();
  if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  const { data: opportunity } = await auth.admin.from("opportunities").select("id,owner_id,title,status").eq("id", application.opportunity_id).maybeSingle();
  if (!opportunity) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
  const isApplicant = application.applicant_id === auth.user.id;
  const isPoster = opportunity.owner_id === auth.user.id;
  if (isApplicant) {
    if (nextStatus !== "withdrawn" || application.status !== "submitted")
      return NextResponse.json({ error: "Only a submitted application can be withdrawn." }, { status: 409 });
  } else if (isPoster) {
    if (!["shortlisted", "accepted", "rejected"].includes(nextStatus))
      return NextResponse.json({ error: "Invalid application status." }, { status: 400 });
    if (!["submitted", "shortlisted"].includes(application.status))
      return NextResponse.json({ error: "This application has already been decided." }, { status: 409 });
  } else return NextResponse.json({ error: "You cannot update this application." }, { status: 403 });
  if (nextStatus === "accepted") {
    const { data: accepted } = await auth.admin.from("opportunity_applications").select("id").eq("opportunity_id", application.opportunity_id).eq("status", "accepted").neq("id", application.id).maybeSingle();
    if (accepted) return NextResponse.json({ error: "Another applicant has already been accepted." }, { status: 409 });
  }
  const { data, error } = await auth.admin.from("opportunity_applications").update({ status: nextStatus }).eq("id", application.id).select("*").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Another applicant has already been accepted." : "Could not update the application." }, { status: 409 });
  let conversation = null;
  if (["shortlisted", "accepted"].includes(nextStatus)) {
    const result = await auth.admin.from("opportunity_conversations").upsert({
      opportunity_id: opportunity.id,
      application_id: application.id,
      job_poster_id: opportunity.owner_id,
      freelancer_id: application.applicant_id,
      status: "active",
    }, { onConflict: "application_id" }).select("id").single();
    conversation = result.data;
  }
  if (nextStatus === "accepted")
    await auth.admin.from("opportunities").update({ status: "closed" }).eq("id", opportunity.id);
  if (nextStatus === "rejected")
    await auth.admin.from("opportunity_conversations").update({ status: "closed" }).eq("application_id", application.id);
  if (isPoster) await sendOpportunityNotification(auth.admin, {
    userId: application.applicant_id,
    type: `application_${nextStatus}`,
    title: nextStatus === "shortlisted" ? "Application shortlisted" : nextStatus === "accepted" ? "Application accepted" : "Application update",
    message: `Your application for ${opportunity.title} was ${nextStatus}.`,
    entityType: conversation ? "opportunity_conversation" : "opportunity_application",
    entityId: conversation?.id || application.id,
    deduplicationKey: `application-status:${application.id}:${nextStatus}`,
  });
  return NextResponse.json({ application: data, conversation });
}
