import { NextRequest, NextResponse } from "next/server";
import { rateLimitWindow, sanitizeReportInput, validUuid } from "@/lib/job-opportunities";
import { isSuspended, requireOpportunityUser } from "@/lib/job-opportunities-server";

export async function POST(request: NextRequest) {
  const auth = await requireOpportunityUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await isSuspended(auth.admin, auth.user.id)) return NextResponse.json({ error: "This account is suspended." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid report." }, { status: 400 }); }
  const entityType = body.entityType === "conversation" ? "conversation" : "opportunity";
  if (!validUuid(body.entityId)) return NextResponse.json({ error: "Invalid report destination." }, { status: 400 });
  const report = sanitizeReportInput(body);
  const { count } = await auth.admin.from("community_reports").select("id", { count: "exact", head: true }).eq("reporter_id", auth.user.id).gte("created_at", rateLimitWindow());
  if ((count || 0) >= 10) return NextResponse.json({ error: "Daily report limit reached." }, { status: 429 });
  if (entityType === "conversation") {
    const { data } = await auth.admin.from("opportunity_conversations").select("job_poster_id,freelancer_id").eq("id", body.entityId).maybeSingle();
    if (!data || ![data.job_poster_id, data.freelancer_id].includes(auth.user.id)) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  } else {
    const { data } = await auth.admin.from("opportunities").select("id").eq("id", body.entityId).maybeSingle();
    if (!data) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
  }
  const { data, error } = await auth.admin.from("community_reports").insert({ reporter_id: auth.user.id, entity_type: entityType, entity_id: body.entityId, ...report, status: "open" }).select("id,status").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "You already have an active report for this item." : "Could not submit this report." }, { status: error.code === "23505" ? 409 : 400 });
  return NextResponse.json({ report: data }, { status: 201 });
}
