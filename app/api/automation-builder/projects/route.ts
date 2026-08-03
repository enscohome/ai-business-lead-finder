import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  automationEntitlementError,
  getAutomationBuilderEntitlement,
} from "@/lib/automation-builder/entitlement";
import { AUTOMATION_PROJECT_SELECT } from "@/lib/automation-builder/projects";
import {
  buildWorkflowPlan,
  getAutomationCategory,
  rebuildPlanConnections,
} from "@/lib/automation-builder/planner";
import {
  findAutomationSecrets,
  sanitizeAutomationRequirements,
  sanitizeWorkflowPlan,
  validateAutomationRequirements,
} from "@/lib/automation-builder/security";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const entitlement = await getAutomationBuilderEntitlement(supabase, user);
  if (!entitlement.allowed && !entitlement.readOnly) {
    const denied = automationEntitlementError(entitlement);
    return NextResponse.json(denied.body, { status: denied.status });
  }
  const { data, error } = await supabase
    .from("automation_workflow_projects")
    .select(AUTOMATION_PROJECT_SELECT)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (error)
    return NextResponse.json(
      {
        error:
          "Saved automations are not configured yet. Apply the reviewed migration first.",
      },
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
  const entitlement = await getAutomationBuilderEntitlement(supabase, user);
  if (!entitlement.allowed) {
    const denied = automationEntitlementError(entitlement);
    return NextResponse.json(denied.body, { status: denied.status });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid project data." }, { status: 400 });
  }
  if (body.action === "duplicate" && typeof body.projectId === "string") {
    const { data: source } = await supabase
      .from("automation_workflow_projects")
      .select(AUTOMATION_PROJECT_SELECT)
      .eq("id", body.projectId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!source)
      return NextResponse.json(
        { error: "Automation project not found." },
        { status: 404 },
      );
    const { id: _id, created_at: _created, updated_at: _updated, ...copy } =
      source as Record<string, unknown>;
    const { data, error } = await supabase
      .from("automation_workflow_projects")
      .insert({
        ...copy,
        user_id: user.id,
        project_name: `${String(source.project_name).slice(0, 110)} copy`,
        generation_count: 0,
      })
      .select(AUTOMATION_PROJECT_SELECT)
      .single();
    if (error)
      return NextResponse.json(
        { error: "Could not duplicate this automation." },
        { status: 400 },
      );
    return NextResponse.json({ project: data }, { status: 201 });
  }
  const secretFields = [
    ...findAutomationSecrets(body.requirements, "requirements"),
    ...findAutomationSecrets(body.plan, "plan"),
  ];
  if (secretFields.length)
    return NextResponse.json(
      {
        error: "Remove credentials and secret values before saving.",
        code: "SECRET_DETECTED",
        fields: secretFields,
      },
      { status: 400 },
    );
  const requirements = sanitizeAutomationRequirements(body.requirements);
  const errors = validateAutomationRequirements(requirements);
  if (!requirements.projectName)
    return NextResponse.json({ error: "Project name is required." }, { status: 400 });
  const fallback = buildWorkflowPlan(requirements);
  const plan = rebuildPlanConnections(sanitizeWorkflowPlan(body.plan, fallback));
  const status = errors.length ? "draft" : "planned";
  const { data, error } = await supabase
    .from("automation_workflow_projects")
    .insert({
      user_id: user.id,
      project_name: requirements.projectName,
      client_name: requirements.clientName,
      business_type: requirements.businessType,
      automation_category: getAutomationCategory(requirements),
      customer_problem: requirements.customerProblem,
      requirements,
      workflow_plan: plan,
      generated_workflow: {},
      workflow_summary: "",
      required_credentials: plan.requiredCredentials,
      supported_nodes: plan.nodes.map((node) => node.key),
      validation_status: "not_validated",
      validation_errors: [],
      target_platform: "n8n",
      target_n8n_version: requirements.n8nVersion || null,
      status,
    })
    .select(AUTOMATION_PROJECT_SELECT)
    .single();
  if (error)
    return NextResponse.json(
      { error: "Could not save this automation project." },
      { status: 400 },
    );
  return NextResponse.json({ project: data }, { status: 201 });
}
