import { NextRequest, NextResponse } from "next/server";
import { requireControlCentre } from "@/lib/control-centre";
import { opportunityInputError, sanitizeOpportunityInput, validUuid } from "@/lib/job-opportunities";
import { sanitizeText } from "@/lib/freelancer";

export async function GET(request: NextRequest) {
  const auth = await requireControlCentre();
  if (!auth) return NextResponse.json({ error: "Owner Control Centre access required." }, { status: 403 });
  const q = sanitizeText(request.nextUrl.searchParams.get("q"), 80).toLowerCase();
  const { data: listed, error } = await auth.admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) return NextResponse.json({ error: "Could not search clients." }, { status: 400 });
  const ids = listed.users.map((user) => user.id);
  const { data: profiles } = ids.length
    ? await auth.admin.from("user_profiles").select("id,full_name,is_suspended").in("id", ids)
    : { data: [] as any[] };
  const byId = new Map((profiles || []).map((profile: any) => [profile.id, profile]));
  const users = listed.users.map((user) => ({
    id: user.id,
    full_name: byId.get(user.id)?.full_name || user.user_metadata?.full_name || "LeadPilot member",
    email: user.email || "",
    is_suspended: byId.get(user.id)?.is_suspended === true,
  })).filter((user) => !q || `${user.full_name} ${user.email}`.toLowerCase().includes(q)).slice(0, 30);
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const auth = await requireControlCentre({ ownerOrAdmin: true });
  if (!auth) return NextResponse.json({ error: "Owner or administrator access required." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid job request." }, { status: 400 }); }
  const input = sanitizeOpportunityInput(body);
  const validation = opportunityInputError(input);
  if (validation) return NextResponse.json({ error: validation }, { status: 400 });
  const clientUserId = validUuid(body.clientUserId) ? body.clientUserId : null;
  const managedClientName = sanitizeText(body.managedClientName, 160);
  if (!clientUserId && managedClientName.length < 2)
    return NextResponse.json({ error: "Select a LeadPilot client or enter a managed client name." }, { status: 400 });
  if (clientUserId) {
    const { data: client } = await auth.admin.from("user_profiles").select("id,is_suspended").eq("id", clientUserId).maybeSingle();
    if (!client || client.is_suspended) return NextResponse.json({ error: "The selected client is unavailable." }, { status: 400 });
  }
  const initialStatus = body.initialStatus === "approved" ? "approved" : "pending_review";
  const notes = sanitizeText(body.privateOwnerNotes, 5000);
  const now = new Date().toISOString();
  const { data, error } = await auth.admin.from("opportunities").insert({
    ...input,
    owner_id: clientUserId || auth.user.id,
    client_user_id: clientUserId,
    managed_client_name: clientUserId ? null : managedClientName,
    created_by: auth.user.id,
    status: initialStatus,
    approved_by: initialStatus === "approved" ? auth.user.id : null,
    approved_at: initialStatus === "approved" ? now : null,
  }).select("*").single();
  if (error) return NextResponse.json({ error: "Could not create the managed job request." }, { status: 400 });
  if (notes) await auth.admin.from("opportunity_owner_notes").insert({ opportunity_id: data.id, notes, updated_by: auth.user.id });
  await auth.admin.from("opportunity_status_events").insert({
    opportunity_id: data.id, previous_status: null, new_status: initialStatus,
    changed_by: auth.user.id, reason: "Created from Owner Control Centre",
  });
  return NextResponse.json({ opportunity: data }, { status: 201 });
}
