import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  sanitizePromptOutputs,
  sanitizeWebsitePromptInput,
} from "@/lib/website-prompt";

const select =
  "id,project_name,business_name,industry,target_ai,generated_prompt,general_brief,form_data,prompt_outputs,status,created_at,updated_at";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .from("website_prompt_projects")
    .select(select)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (error)
    return NextResponse.json(
      { error: "Saved website prompts are not configured yet." },
      { status: 503 },
    );
  return NextResponse.json({ projects: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const form = sanitizeWebsitePromptInput(body.formData);
    if (!form.projectName || !form.businessName)
      return NextResponse.json(
        { error: "Project and business names are required." },
        { status: 400 },
      );
    const outputs = sanitizePromptOutputs(body.outputs);
    const target = ["codex", "claude", "kimi", "general"].includes(
      body.targetAi,
    )
      ? body.targetAi
      : "codex";
    const generated = outputs[target as keyof typeof outputs];
    const general = outputs.general;
    const { data, error } = await supabase
      .from("website_prompt_projects")
      .insert({
        user_id: user.id,
        project_name: form.projectName,
        business_name: form.businessName,
        industry: form.industry,
        business_description: form.businessDescription,
        products_services: form.productsServices,
        target_customers: form.targetCustomers,
        country_code: "NG",
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
        generated_prompt: generated,
        general_brief: general,
        form_data: form,
        prompt_outputs: outputs,
        status: generated ? "generated" : "draft",
      })
      .select(select)
      .single();
    if (error)
      return NextResponse.json(
        { error: "Could not save this website prompt." },
        { status: 400 },
      );
    return NextResponse.json({ project: data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Invalid project data." },
      { status: 400 },
    );
  }
}
