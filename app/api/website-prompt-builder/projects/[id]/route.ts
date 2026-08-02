import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  sanitizePromptOutputs,
  sanitizeWebsitePromptInput,
} from "@/lib/website-prompt";

const select =
  "id,project_name,business_name,industry,target_ai,generated_prompt,general_brief,form_data,prompt_outputs,status,created_at,updated_at";

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .from("website_prompt_projects")
    .select(select)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data)
    return NextResponse.json(
      { error: "Website prompt not found." },
      { status: 404 },
    );
  return NextResponse.json({ project: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const form = sanitizeWebsitePromptInput(body.formData);
    const outputs = sanitizePromptOutputs(body.outputs);
    const target = ["codex", "claude", "kimi", "general"].includes(
      body.targetAi,
    )
      ? body.targetAi
      : "codex";
    const { data, error } = await supabase
      .from("website_prompt_projects")
      .update({
        project_name: form.projectName,
        business_name: form.businessName,
        industry: form.industry,
        business_description: form.businessDescription,
        products_services: form.productsServices,
        target_customers: form.targetCustomers,
        city: form.city || null,
        website_purpose: form.websitePurpose,
        selected_pages: form.selectedPages,
        custom_pages: form.customPages,
        selected_features: form.selectedFeatures,
        custom_features: form.customFeatures,
        design_preferences: form.designPreferences,
        technical_preferences: form.technicalPreferences,
        contact_information: form.contactInformation,
        target_ai: target,
        generated_prompt: outputs[target as keyof typeof outputs],
        general_brief: outputs.general,
        form_data: form,
        prompt_outputs: outputs,
        status: body.status === "draft" ? "draft" : "generated",
      })
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select(select)
      .maybeSingle();
    if (error || !data)
      return NextResponse.json(
        { error: "Website prompt not found or could not be updated." },
        { status: 404 },
      );
    return NextResponse.json({ project: data });
  } catch {
    return NextResponse.json(
      { error: "Invalid project data." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { error } = await supabase
    .from("website_prompt_projects")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);
  if (error)
    return NextResponse.json(
      { error: "Could not delete this website prompt." },
      { status: 400 },
    );
  return NextResponse.json({ ok: true });
}
