import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  automationEntitlementError,
  getAutomationBuilderEntitlement,
} from "@/lib/automation-builder/entitlement";
import { buildAutomationArtifact } from "@/lib/automation-builder/generator";
import {
  buildWorkflowPlan,
  getAutomationCategory,
  rebuildPlanConnections,
} from "@/lib/automation-builder/planner";
import { recordAutomationRequest } from "@/lib/automation-builder/rate-limit";
import {
  automationSlug,
  findAutomationSecrets,
  sanitizeAutomationRequirements,
  sanitizeWorkflowPlan,
  validateAutomationRequirements,
} from "@/lib/automation-builder/security";
import {
  repairN8nWorkflow,
  validateN8nWorkflow,
} from "@/lib/automation-builder/validator";
import { isSupportedNodeKey } from "@/lib/automation-builder/catalogue";
import type {
  AutomationRequirements,
  AutomationWorkflowPlan,
  N8nWorkflow,
} from "@/types/automation-workflow";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function recordValidationFailure(input: {
  supabase: any;
  userId: string;
  projectId: string | null;
  requirements: AutomationRequirements;
  plan: AutomationWorkflowPlan;
  workflow: N8nWorkflow;
  errors: string[];
}) {
  const payload = {
    user_id: input.userId,
    project_name: input.requirements.projectName,
    client_name: input.requirements.clientName,
    business_type: input.requirements.businessType,
    automation_category: getAutomationCategory(input.requirements),
    customer_problem: input.requirements.customerProblem,
    requirements: input.requirements,
    workflow_plan: input.plan,
    generated_workflow: {},
    workflow_summary: "Workflow generation stopped because validation failed.",
    required_credentials: input.plan.requiredCredentials,
    supported_nodes: input.plan.nodes.map((node) => node.key),
    validation_status: "invalid",
    validation_errors: input.errors,
    target_platform: "n8n",
    target_n8n_version: input.requirements.n8nVersion || null,
    status: "validation_failed",
  };
  let projectId = input.projectId;
  if (projectId) {
    const { data, error } = await input.supabase
      .from("automation_workflow_projects")
      .update(payload)
      .eq("id", projectId)
      .eq("user_id", input.userId)
      .select("id")
      .maybeSingle();
    if (error || !data) projectId = null;
  }
  if (!projectId) {
    const { data } = await input.supabase
      .from("automation_workflow_projects")
      .insert(payload)
      .select("id")
      .maybeSingle();
    projectId = data?.id || null;
  }
  if (!projectId) return null;
  await input.supabase.from("automation_workflow_generation_events").insert({
    user_id: input.userId,
    project_id: projectId,
    event_type: "validation_failed",
    validation_status: "invalid",
    details: { errors: input.errors.slice(0, 10) },
  });
  await input.supabase.rpc("record_automation_validation_failure", {
    p_user_id: input.userId,
    p_project_id: projectId,
    p_failure_key: automationSlug(input.errors.join(" ")).slice(0, 120),
    p_message:
      "The generated workflow could not pass safety validation. Open the project to review the validation errors.",
  });
  return projectId;
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "You must be logged in to generate an automation." },
      { status: 401 },
    );
  const entitlement = await getAutomationBuilderEntitlement(supabase, user);
  if (!entitlement.allowed) {
    const denied = automationEntitlementError(entitlement);
    return NextResponse.json(denied.body, { status: denied.status });
  }
  if (
    !entitlement.isOwner &&
    entitlement.generationsUsed >= entitlement.generationsLimit
  )
    return NextResponse.json(
      {
        error:
          "You have reached the monthly AI builder generation limit included in your plan.",
        code: "MONTHLY_LIMIT_REACHED",
        entitlement,
        upgradeUrl: "/pricing",
      },
      { status: 429 },
    );
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const secretFields = [
    ...findAutomationSecrets(body.requirements, "requirements"),
    ...findAutomationSecrets(body.plan, "plan"),
  ];
  if (secretFields.length)
    return NextResponse.json(
      {
        error:
          "Remove credentials, API keys, passwords, tokens, and authorization values before generating the workflow.",
        code: "SECRET_DETECTED",
        fields: secretFields,
      },
      { status: 400 },
    );
  const requirements = sanitizeAutomationRequirements(body.requirements);
  const requirementErrors = validateAutomationRequirements(requirements);
  if (requirementErrors.length)
    return NextResponse.json(
      { error: requirementErrors[0], errors: requirementErrors },
      { status: 400 },
    );
  const rawNodes =
    body.plan && typeof body.plan === "object"
      ? (body.plan as Record<string, unknown>).nodes
      : null;
  const unsupportedKeys = Array.isArray(rawNodes)
    ? rawNodes
        .map((node) =>
          node && typeof node === "object"
            ? (node as Record<string, unknown>).key
            : null,
        )
        .filter((key) => key != null && !isSupportedNodeKey(key))
    : [];
  if (unsupportedKeys.length)
    return NextResponse.json(
      {
        error: "The workflow plan contains unsupported node types.",
        code: "UNSUPPORTED_NODE",
        nodes: unsupportedKeys,
      },
      { status: 400 },
    );
  const requestedProjectId =
    typeof body.projectId === "string" && UUID_PATTERN.test(body.projectId)
      ? body.projectId
      : null;
  const rateLimit = await recordAutomationRequest(
    supabase,
    user.id,
    "request_started",
  );
  if (!rateLimit.ok)
    return NextResponse.json(
      { error: rateLimit.error },
      { status: rateLimit.status },
    );
  try {
    const fallbackPlan = buildWorkflowPlan(requirements);
    const plan = rebuildPlanConnections(
      sanitizeWorkflowPlan(body.plan, fallbackPlan),
    );
    const generated = buildAutomationArtifact(requirements, plan);
    let workflow = JSON.parse(
      JSON.stringify(generated.workflow),
    ) as N8nWorkflow;
    const firstValidation = validateN8nWorkflow(workflow);
    let validation = firstValidation;
    if (!firstValidation.valid) {
      workflow = repairN8nWorkflow(workflow);
      const repairedValidation = validateN8nWorkflow(workflow);
      validation = {
        ...repairedValidation,
        repaired: true,
        warnings: [
          ...repairedValidation.warnings,
          "A controlled repair pass normalized workflow structure before final validation.",
        ],
      };
    }
    if (!validation.valid) {
      const projectId = await recordValidationFailure({
        supabase,
        userId: user.id,
        projectId: requestedProjectId,
        requirements,
        plan,
        workflow,
        errors: validation.errors,
      });
      return NextResponse.json(
        {
          error:
            "The workflow could not pass safety validation, so no downloadable file was created.",
          code: "WORKFLOW_VALIDATION_FAILED",
          validation,
          projectId,
        },
        { status: 422 },
      );
    }
    const artifact = {
      ...generated,
      workflow,
      validation,
      source:
        body.source === "openai"
          ? ("openai" as const)
          : ("structured-template" as const),
    };
    const { data: saved, error: saveError } = await supabase.rpc(
      "save_automation_workflow_generation",
      {
        p_user_id: user.id,
        p_project_id: requestedProjectId,
        p_limit: entitlement.generationsLimit,
        p_project_name: requirements.projectName,
        p_client_name: requirements.clientName,
        p_business_type: requirements.businessType,
        p_automation_category: getAutomationCategory(requirements),
        p_customer_problem: requirements.customerProblem,
        p_requirements: requirements,
        p_workflow_plan: plan,
        p_generated_workflow: workflow,
        p_workflow_summary: artifact.summary,
        p_required_credentials: artifact.requiredCredentials,
        p_supported_nodes: plan.nodes.map((node) => node.key),
        p_target_n8n_version: requirements.n8nVersion,
      },
    );
    const record = Array.isArray(saved) ? saved[0] : saved;
    if (saveError || !record?.project_id) {
      const limitReached = /USAGE_LIMIT_REACHED/i.test(saveError?.message || "");
      return NextResponse.json(
        {
          error: limitReached
            ? "You have reached the monthly AI builder generation limit included in your plan."
            : "The workflow was validated, but it could not be saved safely. No download was released.",
          code: limitReached
            ? "MONTHLY_LIMIT_REACHED"
            : "AUTOMATION_STORAGE_UNAVAILABLE",
          entitlement,
          upgradeUrl: "/pricing",
        },
        { status: limitReached ? 429 : 503 },
      );
    }
    return NextResponse.json({
      artifact,
      project: {
        id: record.project_id,
        generationCount: record.generation_count,
      },
      usage: {
        used: entitlement.isOwner ? null : record.usage_count,
        limit: entitlement.isOwner ? null : entitlement.generationsLimit,
        resetAt: entitlement.resetAt,
        unlimited: entitlement.isOwner,
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Automation generation is temporarily unavailable. No usage was deducted.",
      },
      { status: 500 },
    );
  }
}
