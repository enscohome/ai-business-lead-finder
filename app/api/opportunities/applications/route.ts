import { NextResponse } from "next/server";
import { requireOpportunityUser, userDisplayNames } from "@/lib/job-opportunities-server";

export async function GET() {
  const auth = await requireOpportunityUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await auth.admin.from("opportunity_applications").select("*").eq("applicant_id", auth.user.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load your applications." }, { status: 400 });
  const opportunityIds = (data || []).map((row: any) => row.opportunity_id);
  const [{ data: opportunities }, { data: conversations }] = await Promise.all([
    opportunityIds.length ? auth.admin.from("opportunities").select("*").in("id", opportunityIds) : Promise.resolve({ data: [] as any[] }),
    auth.admin.from("opportunity_conversations").select("id,application_id").eq("freelancer_id", auth.user.id),
  ]);
  const names = await userDisplayNames(auth.admin, (opportunities || []).map((row: any) => row.owner_id));
  return NextResponse.json({ applications: (data || []).map((application: any) => {
    const opportunity = (opportunities || []).find((row: any) => row.id === application.opportunity_id);
    return { ...application, opportunity: opportunity ? { ...opportunity, poster_name: names.get(opportunity.owner_id) } : null, conversation_id: (conversations || []).find((c: any) => c.application_id === application.id)?.id || null };
  }) });
}
