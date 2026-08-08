import { NextRequest, NextResponse } from "next/server";
import { verifiedUserIds } from "@/lib/control-centre";
import { validUuid } from "@/lib/job-opportunities";
import { requireOpportunityUser, userDisplayNames } from "@/lib/job-opportunities-server";

async function conversationForUser(id: string) {
  const auth = await requireOpportunityUser();
  if (!auth) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!validUuid(id)) return { response: NextResponse.json({ error: "Invalid conversation ID." }, { status: 400 }) };
  const { data: membership } = await auth.admin.from("opportunity_conversation_participants").select("*").eq("conversation_id", id).eq("user_id", auth.user.id).maybeSingle();
  if (!membership) return { response: NextResponse.json({ error: "Conversation not found." }, { status: 404 }) };
  if (membership.left_at) return { response: NextResponse.json({ error: "You left this conversation." }, { status: 410 }) };
  const { data: conversation } = await auth.admin.from("opportunity_conversations").select("*").eq("id", id).maybeSingle();
  if (!conversation) return { response: NextResponse.json({ error: "Conversation not found." }, { status: 404 }) };
  return { auth, conversation, membership };
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const found = await conversationForUser(params.id);
  if (found.response) return found.response;
  const { auth, conversation, membership } = found as any;
  const [{ data: opportunity }, { data: messages }, { data: blocks }, { data: members }] = await Promise.all([
    auth.admin.from("opportunities").select("id,title,status").eq("id", conversation.opportunity_id).maybeSingle(),
    auth.admin.from("opportunity_messages").select("id,conversation_id,sender_id,message,read_at,created_at,updated_at").eq("conversation_id", conversation.id).order("created_at").limit(500),
    auth.admin.from("opportunity_blocks").select("blocker_id,blocked_user_id").eq("conversation_id", conversation.id),
    auth.admin.from("opportunity_conversation_participants").select("user_id,participant_role,joined_at,left_at").eq("conversation_id", conversation.id).is("left_at", null),
  ]);
  const userIds = (members || []).map((row: any) => row.user_id);
  const [names, verified] = await Promise.all([userDisplayNames(auth.admin, userIds), verifiedUserIds(auth.admin, userIds)]);
  const now = new Date().toISOString();
  await auth.admin.from("opportunity_conversation_participants").update({ last_read_at: now }).eq("conversation_id", conversation.id).eq("user_id", auth.user.id);
  return NextResponse.json({
    conversation: {
      ...conversation, opportunity, role: membership.participant_role,
      participants: (members || []).map((row: any) => ({ ...row, display_name: names.get(row.user_id), is_verified: verified.has(row.user_id) })),
      other_name: (members || []).filter((row: any) => row.user_id !== auth.user.id).map((row: any) => names.get(row.user_id)).join(", ") || "LeadPilot project room",
      blocked: Boolean((blocks || []).length),
      blocked_by_me: (blocks || []).some((row: any) => row.blocker_id === auth.user.id),
    },
    messages: messages || [], currentUserId: auth.user.id,
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const found = await conversationForUser(params.id);
  if (found.response) return found.response;
  const { auth, conversation } = found as any;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const action = String(body.action || "");
  const now = new Date().toISOString();
  if (action === "read") {
    await auth.admin.from("opportunity_conversation_participants").update({ last_read_at: now }).eq("conversation_id", conversation.id).eq("user_id", auth.user.id);
  } else if (action === "archive") {
    await auth.admin.from("opportunity_conversation_participants").update({ archived_at: now }).eq("conversation_id", conversation.id).eq("user_id", auth.user.id);
  } else if (action === "leave") {
    await auth.admin.from("opportunity_conversation_participants").update({ left_at: now }).eq("conversation_id", conversation.id).eq("user_id", auth.user.id);
  } else if (action === "block") {
    const { data: members } = await auth.admin.from("opportunity_conversation_participants").select("user_id").eq("conversation_id", conversation.id).neq("user_id", auth.user.id).is("left_at", null);
    const requested = validUuid(body.blockedUserId) ? body.blockedUserId : members?.[0]?.user_id;
    if (!requested || !(members || []).some((row: any) => row.user_id === requested)) return NextResponse.json({ error: "Select a conversation participant to block." }, { status: 400 });
    await auth.admin.from("opportunity_blocks").upsert({ blocker_id: auth.user.id, blocked_user_id: requested, conversation_id: conversation.id }, { onConflict: "blocker_id,blocked_user_id,conversation_id" });
  } else if (action === "unblock") {
    await auth.admin.from("opportunity_blocks").delete().eq("conversation_id", conversation.id).eq("blocker_id", auth.user.id);
  } else return NextResponse.json({ error: "Unknown conversation action." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
