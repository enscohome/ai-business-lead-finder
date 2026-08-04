import { NextRequest, NextResponse } from "next/server";
import { sanitizeText } from "@/lib/freelancer";
import { rateLimitWindow, validUuid } from "@/lib/job-opportunities";
import { isSuspended, requireOpportunityUser } from "@/lib/job-opportunities-server";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireOpportunityUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!validUuid(params.id)) return NextResponse.json({ error: "Invalid conversation ID." }, { status: 400 });
  if (await isSuspended(auth.admin, auth.user.id)) return NextResponse.json({ error: "This account is suspended." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid message." }, { status: 400 }); }
  const message = sanitizeText(body.message, 4000);
  if (!message) return NextResponse.json({ error: "Enter a message." }, { status: 400 });
  const { data: conversation } = await auth.admin.from("opportunity_conversations").select("*").eq("id", params.id).maybeSingle();
  if (!conversation || ![conversation.job_poster_id, conversation.freelancer_id].includes(auth.user.id))
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  if (conversation.status !== "active" || conversation.poster_left_at || conversation.freelancer_left_at)
    return NextResponse.json({ error: "This conversation is closed." }, { status: 409 });
  const { data: block } = await auth.admin.from("opportunity_blocks").select("blocker_id").eq("conversation_id", conversation.id).maybeSingle();
  if (block) return NextResponse.json({ error: "Messages are disabled because a participant blocked this conversation." }, { status: 403 });
  const { count } = await auth.admin.from("opportunity_messages").select("id", { count: "exact", head: true }).eq("sender_id", auth.user.id).gte("created_at", rateLimitWindow(1));
  if ((count || 0) >= 100) return NextResponse.json({ error: "Hourly message limit reached. Try again later." }, { status: 429 });
  const { data, error } = await auth.admin.from("opportunity_messages").insert({ conversation_id: conversation.id, sender_id: auth.user.id, message }).select("id,conversation_id,sender_id,message,read_at,created_at,updated_at").single();
  if (error) return NextResponse.json({ error: "Could not send this message." }, { status: 400 });
  await auth.admin.from("opportunity_conversations").update({ updated_at: new Date().toISOString(), poster_archived_at: null, freelancer_archived_at: null }).eq("id", conversation.id);
  return NextResponse.json({ message: data }, { status: 201 });
}
