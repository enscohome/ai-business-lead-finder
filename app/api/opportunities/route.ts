import { NextRequest, NextResponse } from "next/server";
import {
  opportunityInputError,
  rateLimitWindow,
  sanitizeOpportunityInput,
} from "@/lib/job-opportunities";
import {
  isSuspended,
  requireOpportunityUser,
  userDisplayNames,
} from "@/lib/job-opportunities-server";

export async function GET(request: NextRequest) {
  const auth = await requireOpportunityUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = request.nextUrl.searchParams;
  const mode = params.get("mode") || "feed";
  let query = auth.supabase.from("opportunities").select("*");
  if (mode === "my-posts") query = query.eq("owner_id", auth.user.id);
  else if (mode === "feed" || mode === "saved")
    query = query.eq("status", "open").not("approved_at", "is", null);
  const status = params.get("status");
  if (mode === "my-posts" && status && status !== "all") query = query.eq("status", status);
  for (const [key, column] of [
    ["category", "category"],
    ["country", "country_code"],
    ["location", "work_location_type"],
    ["budget", "budget_type"],
    ["experience", "experience_level"],
  ] as const) {
    const value = params.get(key);
    if (value && value !== "all") query = query.eq(column, value);
  }
  const search = params.get("q")?.trim();
  const safeSearch = search
    ?.replace(/[%(),\\]/g, "")
    .slice(0, 80);
  if (safeSearch)
    query = query.or(
      `title.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`,
    );
  const date = params.get("date");
  if (date && ["1", "7", "30"].includes(date))
    query = query.gte("created_at", new Date(Date.now() - Number(date) * 86400000).toISOString());
  const { data, error } = await query.order("created_at", { ascending: false }).limit(100);
  if (error)
    return NextResponse.json({ error: "Job Opportunities are not configured yet." }, { status: 503 });
  let rows = data || [];
  const { data: saved } = await auth.supabase
    .from("saved_opportunities")
    .select("opportunity_id")
    .eq("user_id", auth.user.id);
  const savedIds = new Set((saved || []).map((row: any) => row.opportunity_id));
  if (mode === "saved") rows = rows.filter((row: any) => savedIds.has(row.id));
  const ids = rows.map((row: any) => row.id);
  const { data: applications } = ids.length
    ? await auth.admin.from("opportunity_applications").select("opportunity_id,status").in("opportunity_id", ids)
    : { data: [] as any[] };
  const names = await userDisplayNames(auth.admin, rows.map((row: any) => row.owner_id));
  const opportunities = rows.map((row: any) => ({
    ...row,
    poster_name: names.get(row.owner_id),
    application_count: (applications || []).filter((item: any) => item.opportunity_id === row.id).length,
    shortlisted_count: (applications || []).filter((item: any) => item.opportunity_id === row.id && ["shortlisted", "accepted"].includes(item.status)).length,
    is_saved: savedIds.has(row.id),
    is_owner: row.owner_id === auth.user.id,
  }));
  return NextResponse.json({ opportunities });
}

export async function POST(request: NextRequest) {
  const auth = await requireOpportunityUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await isSuspended(auth.admin, auth.user.id))
    return NextResponse.json({ error: "This account is suspended." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid opportunity data." }, { status: 400 });
  }
  const input = sanitizeOpportunityInput(body);
  const validation = opportunityInputError(input);
  if (validation) return NextResponse.json({ error: validation }, { status: 400 });
  const { count } = await auth.admin
    .from("opportunities").select("id", { count: "exact", head: true })
    .eq("owner_id", auth.user.id).gte("created_at", rateLimitWindow());
  if ((count || 0) >= 10)
    return NextResponse.json({ error: "Daily opportunity-posting limit reached." }, { status: 429 });
  const { data, error } = await auth.admin.from("opportunities").insert({
    ...input,
    owner_id: auth.user.id,
    status: "pending_review",
    approved_at: null,
    approved_by: null,
  }).select("*").single();
  if (error) return NextResponse.json({ error: "Could not create this opportunity." }, { status: 400 });
  return NextResponse.json({ opportunity: data }, { status: 201 });
}
