import { NextResponse } from "next/server";
import { requireOpportunityUser, userDisplayNames } from "@/lib/job-opportunities-server";

export async function GET() {
  const auth = await requireOpportunityUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await auth.admin.from("opportunity_conversations").select("*")
    .or(`job_poster_id.eq.${auth.user.id},freelancer_id.eq.${auth.user.id}`)
    .order("updated_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Could not load conversations." }, { status: 400 });
  const visible = (data || []).filter((row: any) => {
    const isPoster = row.job_poster_id === auth.user.id;
    return !(isPoster ? row.poster_archived_at : row.freelancer_archived_at) && !(isPoster ? row.poster_left_at : row.freelancer_left_at);
  });
  const opportunityIds = visible.map((row: any) => row.opportunity_id);
  const conversationIds = visible.map((row: any) => row.id);
  const [{ data: opportunities }, { data: messages }, names] = await Promise.all([
    opportunityIds.length ? auth.admin.from("opportunities").select("id,title").in("id", opportunityIds) : Promise.resolve({ data: [] as any[] }),
    conversationIds.length ? auth.admin.from("opportunity_messages").select("conversation_id,sender_id,message,read_at,created_at").in("conversation_id", conversationIds).order("created_at", { ascending: false }).limit(500) : Promise.resolve({ data: [] as any[] }),
    userDisplayNames(auth.admin, visible.map((row: any) => row.job_poster_id === auth.user.id ? row.freelancer_id : row.job_poster_id)),
  ]);
  return NextResponse.json({ conversations: visible.map((row: any) => {
    const ownMessages = (messages || []).filter((message: any) => message.conversation_id === row.id);
    const otherId = row.job_poster_id === auth.user.id ? row.freelancer_id : row.job_poster_id;
    return {
      ...row,
      opportunity: (opportunities || []).find((item: any) => item.id === row.opportunity_id),
      other_name: names.get(otherId),
      unread_count: ownMessages.filter((message: any) => message.sender_id !== auth.user.id && !message.read_at).length,
      last_message: ownMessages[0]?.message || "No messages yet",
      last_message_at: ownMessages[0]?.created_at || row.created_at,
    };
  }) });
}
