import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enhanceWorkflowPlan } from "@/lib/automation-builder/ai";
import {
  automationEntitlementError,
  getAutomationBuilderEntitlement,
} from "@/lib/automation-builder/entitlement";
import {
  buildWorkflowPlan,
  rebuildPlanConnections,
} from "@/lib/automation-builder/planner";
import { recordAutomationRequest } from "@/lib/automation-builder/rate-limit";
import {
  findAutomationSecrets,
  findHighRiskRequests,
  sanitizeAutomationRequirements,
  validateAutomationRequirements,
} from "@/lib/automation-builder/security";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "You must be logged in to design an automation." },
      { status: 401 },
    );
  const entitlement = await getAutomationBuilderEntitlement(supabase, user);
  if (!entitlement.allowed) {
    const denied = automationEntitlementError(entitlement);
    return NextResponse.json(denied.body, { status: denied.status });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const rawRequirements = (body as Record<string, unknown>)?.requirements;
  const secretFields = findAutomationSecrets(rawRequirements, "requirements");
  if (secretFields.length)
    return NextResponse.json(
      {
        error:
          "Remove credentials, API keys, passwords, tokens, and authorization values before continuing.",
        code: "SECRET_DETECTED",
        fields: secretFields,
      },
      { status: 400 },
    );
  const requirements = sanitizeAutomationRequirements(rawRequirements);
  const errors = validateAutomationRequirements(requirements);
  if (errors.length)
    return NextResponse.json({ error: errors[0], errors }, { status: 400 });
  const rateLimit = await recordAutomationRequest(
    supabase,
    user.id,
    "plan_requested",
  );
  if (!rateLimit.ok)
    return NextResponse.json(
      { error: rateLimit.error },
      { status: rateLimit.status },
    );
  const basePlan = buildWorkflowPlan(requirements);
  const enhanced = await enhanceWorkflowPlan(requirements, basePlan);
  const plan = rebuildPlanConnections(enhanced.plan);
  const highRisk = findHighRiskRequests(requirements);
  return NextResponse.json({
    plan,
    source: enhanced.source,
    highRiskReview: highRisk.length
      ? "This request mentions a higher-risk capability. Version one did not include shell, SSH, local-file, dangerous Code, or community nodes. A qualified human must review any design that still requires them."
      : null,
    usage: {
      used: entitlement.generationsUsed,
      limit: entitlement.isOwner ? null : entitlement.generationsLimit,
      unlimited: entitlement.isOwner,
      resetAt: entitlement.resetAt,
    },
  });
}
