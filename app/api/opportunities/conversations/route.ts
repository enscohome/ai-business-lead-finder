import { NextResponse } from "next/server";
import { verifiedUserIds } from "@/lib/control-centre";
import { requireOpportunityUser, userDisplayNames } from "@/lib/job-opportunities-server";

export async function GET() {
  const auth = await requireOpportunityUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: memberships, error } = await auth.admin.from("opportunity_conversation_participants").select("conversation_id,participant_role,archived_at,left_at,last_read_at").eq("user_id", auth.user.id).is("left_at", null).is("archived_at", null).limit(100);
  if (error) return NextResponse.json({ error: "Project conversations are not configured yet." }, { status: 503 });
  const ids = (memberships || []).map((row: any) => row.conversation_id);
  if (!ids.length) return NextResponse.json({ conversations: [] });
  const [{ data: conversations }, { data: participantRows }, { data: messages }] = await Promise.all([
    auth.admin.from("opportunity_conversations").select("*").in("id", ids).order("updated_at", { ascending: false }),
    auth.admin.from("opportunity_conversation_participants").select("conversation_id,user_id,participant_role,left_at").in("conversation_id", ids).is("left_at", null),
    auth.admin.from("opportunity_messages").select("conversation_id,sender_id,message,created_at").in("conversation_id", ids).order("created_at", { ascending: false }).limit(1000),
  ]);
  const opportunityIds = (conversations || []).map((row: any) => row.opportunity_id);
  const { data: opportunities } = opportunityIds.length ? await auth.admin.from("opportunities").select("id,title,status").in("id", opportunityIds) : { data: [] as any[] };
  const memberIds = (participantRows || []).map((row: any) => row.user_id);
  const [names, verified] = await Promise.all([userDisplayNames(auth.admin, memberIds), verifiedUserIds(auth.admin, memberIds)]);
  const membershipMap = new Map((memberships || []).map((row: any) => [row.conversation_id, row]));
  return NextResponse.json({ conversations: (conversations || []).map((conversation: any) => {
    const membership: any = membershipMap.get(conversation.id);
    const ownMessages = (messages || []).filter((message: any) => message.conversation_id === conversation.id);
    const people = (participantRows || []).filter((row: any) => row.conversation_id === conversation.id).map((row: any) => ({ ...row, display_name: names.get(row.user_id), is_verified: verified.has(row.user_id) }));
    const others = people.filter((row: any) => row.user_id !== auth.user.id);
    return {
      ...conversation,
      opportunity: (opportunities || []).find((item: any) => item.id === conversation.opportunity_id),
      role: membership?.participant_role,
      participants: people,
      other_name: others.map((row: any) => row.display_name).join(", ") || "LeadPilot project room",
      unread_count: ownMessages.filter((message: any) => message.sender_id !== auth.user.id && (!membership?.last_read_at || new Date(message.created_at) > new Date(membership.last_read_at))).length,
      last_message: ownMessages[0]?.message || "No messages yet",
      last_message_at: ownMessages[0]?.created_at || conversation.created_at,
    };
  }) });
}
