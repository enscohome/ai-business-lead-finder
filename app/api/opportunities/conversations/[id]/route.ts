import { NextRequest, NextResponse } from "next/server";
import { validUuid } from "@/lib/job-opportunities";
import { requireOpportunityUser, userDisplayNames } from "@/lib/job-opportunities-server";

async function conversationForUser(id: string) {
  const auth = await requireOpportunityUser();
  if (!auth) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!validUuid(id)) return { response: NextResponse.json({ error: "Invalid conversation ID." }, { status: 400 }) };
  const { data } = await auth.admin.from("opportunity_conversations").select("*").eq("id", id).maybeSingle();
  if (!data || ![data.job_poster_id, data.freelancer_id].includes(auth.user.id))
    return { response: NextResponse.json({ error: "Conversation not found." }, { status: 404 }) };
  return { auth, conversation: data };
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const found = await conversationForUser(params.id);
  if (found.response) return found.response;
  const { auth, conversation } = found as any;
  const isPoster = conversation.job_poster_id === auth.user.id;
  if (isPoster ? conversation.poster_left_at : conversation.freelancer_left_at)
    return NextResponse.json({ error: "You left this conversation." }, { status: 410 });
  const otherId = isPoster ? conversation.freelancer_id : conversation.job_poster_id;
  const [{ data: opportunity }, { data: messages }, { data: block }, names] = await Promise.all([
    auth.admin.from("opportunities").select("id,title,status").eq("id", conversation.opportunity_id).maybeSingle(),
    auth.admin.from("opportunity_messages").select("id,conversation_id,sender_id,message,read_at,created_at,updated_at").eq("conversation_id", conversation.id).order("created_at").limit(500),
    auth.admin.from("opportunity_blocks").select("blocker_id,blocked_user_id").eq("conversation_id", conversation.id).maybeSingle(),
    userDisplayNames(auth.admin, [otherId]),
  ]);
  await auth.admin.from("opportunity_messages").update({ read_at: new Date().toISOString() }).eq("conversation_id", conversation.id).neq("sender_id", auth.user.id).is("read_at", null);
  return NextResponse.json({ conversation: { ...conversation, opportunity, other_name: names.get(otherId), blocked: Boolean(block), blocked_by_me: block?.blocker_id === auth.user.id }, messages: messages || [], currentUserId: auth.user.id });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const found = await conversationForUser(params.id);
  if (found.response) return found.response;
  const { auth, conversation } = found as any;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const action = String(body.action || "");
  const isPoster = conversation.job_poster_id === auth.user.id;
  const otherId = isPoster ? conversation.freelancer_id : conversation.job_poster_id;
  if (action === "read") {
    await auth.admin.from("opportunity_messages").update({ read_at: new Date().toISOString() }).eq("conversation_id", conversation.id).neq("sender_id", auth.user.id).is("read_at", null);
  } else if (action === "archive") {
    await auth.admin.from("opportunity_conversations").update(isPoster ? { poster_archived_at: new Date().toISOString() } : { freelancer_archived_at: new Date().toISOString() }).eq("id", conversation.id);
  } else if (action === "leave") {
    await auth.admin.from("opportunity_conversations").update(isPoster ? { poster_left_at: new Date().toISOString() } : { freelancer_left_at: new Date().toISOString() }).eq("id", conversation.id);
  } else if (action === "block") {
    await auth.admin.from("opportunity_blocks").upsert({ blocker_id: auth.user.id, blocked_user_id: otherId, conversation_id: conversation.id }, { onConflict: "blocker_id,blocked_user_id,conversation_id" });
  } else if (action === "unblock") {
    await auth.admin.from("opportunity_blocks").delete().eq("conversation_id", conversation.id).eq("blocker_id", auth.user.id);
  } else return NextResponse.json({ error: "Unknown conversation action." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
