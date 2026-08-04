import { NextRequest, NextResponse } from "next/server";
import { validUuid } from "@/lib/job-opportunities";
import { requireOpportunityUser } from "@/lib/job-opportunities-server";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireOpportunityUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!validUuid(params.id)) return NextResponse.json({ error: "Invalid opportunity ID." }, { status: 400 });
  const { data: opportunity } = await auth.admin.from("opportunities").select("id,status,approved_at").eq("id", params.id).maybeSingle();
  if (!opportunity || opportunity.status !== "open" || !opportunity.approved_at)
    return NextResponse.json({ error: "Only open opportunities can be saved." }, { status: 404 });
  const { error } = await auth.admin.from("saved_opportunities").upsert({ user_id: auth.user.id, opportunity_id: params.id }, { onConflict: "user_id,opportunity_id", ignoreDuplicates: true });
  return error ? NextResponse.json({ error: "Could not save this opportunity." }, { status: 400 }) : NextResponse.json({ saved: true });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireOpportunityUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!validUuid(params.id)) return NextResponse.json({ error: "Invalid opportunity ID." }, { status: 400 });
  const { error } = await auth.admin.from("saved_opportunities").delete().eq("user_id", auth.user.id).eq("opportunity_id", params.id);
  return error ? NextResponse.json({ error: "Could not remove this saved opportunity." }, { status: 400 }) : NextResponse.json({ saved: false });
}
