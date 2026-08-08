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
} from "@/lib/automation-builder/security";

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
  const entitlement = await getAutomationBuilderEntitlement(supabase, user);
  if (!entitlement.allowed && !entitlement.readOnly) {
    const denied = automationEntitlementError(entitlement);
    return NextResponse.json(denied.body, { status: denied.status });
  }
  const { data, error } = await supabase
    .from("automation_workflow_projects")
    .select(AUTOMATION_PROJECT_SELECT)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data)
    return NextResponse.json(
      { error: "Automation project not found." },
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
  const secretFields = [
    ...findAutomationSecrets(body.requirements, "requirements"),
    ...findAutomationSecrets(body.plan, "plan"),
  ];
  if (secretFields.length)
    return NextResponse.json(
      { error: "Remove credentials and secret values before saving.", fields: secretFields },
      { status: 400 },
    );
  const requirements = sanitizeAutomationRequirements(body.requirements);
  if (!requirements.projectName)
    return NextResponse.json({ error: "Project name is required." }, { status: 400 });
  const plan = rebuildPlanConnections(
    sanitizeWorkflowPlan(body.plan, buildWorkflowPlan(requirements)),
  );
  const { data, error } = await supabase
    .from("automation_workflow_projects")
    .update({
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
      target_n8n_version: requirements.n8nVersion || null,
      status: "planned",
    })
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select(AUTOMATION_PROJECT_SELECT)
    .maybeSingle();
  if (error || !data)
    return NextResponse.json(
      { error: "Automation project not found or could not be updated." },
      { status: 404 },
    );
  return NextResponse.json({ project: data });
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
  const entitlement = await getAutomationBuilderEntitlement(supabase, user);
  if (!entitlement.allowed) {
    const denied = automationEntitlementError(entitlement);
    return NextResponse.json(denied.body, { status: denied.status });
  }
  const { error } = await supabase
    .from("automation_workflow_projects")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);
  if (error)
    return NextResponse.json(
      { error: "Could not delete this automation project." },
      { status: 400 },
    );
  return NextResponse.json({ ok: true });
}
