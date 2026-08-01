import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeExternalUrl, sanitizeText } from "@/lib/freelancer";

export async function POST(request: NextRequest) {
  return mutate(request);
}
export async function PUT(request: NextRequest) {
  return mutate(request);
}
async function mutate(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { data: profile } = await supabase
    .from("freelancer_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile)
    return NextResponse.json(
      { error: "Create your profile first." },
      { status: 400 },
    );
  const payload = {
    freelancer_id: profile.id,
    project_title: sanitizeText(body.projectTitle, 150),
    description: sanitizeText(body.description, 5000),
    cover_image_url: safeExternalUrl(String(body.coverImageUrl || "")) || null,
    project_images: Array.isArray(body.projectImages)
      ? body.projectImages
          .map((url: string) => safeExternalUrl(url))
          .filter(Boolean)
          .slice(0, 8)
      : [],
    skills_used: Array.isArray(body.skillsUsed)
      ? body.skillsUsed
          .map((v: string) => sanitizeText(v, 80))
          .filter(Boolean)
          .slice(0, 20)
      : [],
    category: sanitizeText(body.category, 80),
    client_name: sanitizeText(body.clientName, 120) || null,
    completion_date: body.completionDate || null,
    project_url: safeExternalUrl(String(body.projectUrl || "")) || null,
    external_url: safeExternalUrl(String(body.externalUrl || "")) || null,
    display_order: Number(body.displayOrder) || 0,
    is_visible: body.isVisible !== false,
  };
  if (!payload.project_title)
    return NextResponse.json(
      { error: "Project title is required." },
      { status: 400 },
    );
  const result = body.id
    ? await supabase
        .from("freelancer_portfolio_projects")
        .update(payload)
        .eq("id", body.id)
        .eq("freelancer_id", profile.id)
        .select("*")
        .single()
    : await supabase
        .from("freelancer_portfolio_projects")
        .insert(payload)
        .select("*")
        .single();
  return result.error
    ? NextResponse.json({ error: result.error.message }, { status: 400 })
    : NextResponse.json({ project: result.data });
}
export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id");
  const { data: profile } = await supabase
    .from("freelancer_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!id || !profile)
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const { error } = await supabase
    .from("freelancer_portfolio_projects")
    .delete()
    .eq("id", id)
    .eq("freelancer_id", profile.id);
  return error
    ? NextResponse.json({ error: error.message }, { status: 400 })
    : NextResponse.json({ deleted: true });
}
