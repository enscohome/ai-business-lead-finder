import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  enhanceInferredAutomationRequirements,
  enhanceWorkflowPlan,
} from "@/lib/automation-builder/ai";
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
  getEssentialAutomationQuestion,
  inferAutomationRequirements,
  sanitizeAutomationConversation,
} from "@/lib/automation-builder/conversation";
import {
  cleanAutomationText,
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
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const rawRequirements = body.requirements;
  const rawConversation = Array.isArray(body.conversation)
    ? body.conversation
    : [];
  const prompt = cleanAutomationText(body.prompt, 3000);
  const conversation = sanitizeAutomationConversation([
    ...rawConversation,
    ...(prompt ? [{ role: "user", content: prompt }] : []),
  ]);
  const secretFields = findAutomationSecrets(
    { requirements: rawRequirements, conversation: rawConversation, prompt: body.prompt },
    "request",
  );
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
  const providedRequirements = sanitizeAutomationRequirements(rawRequirements);
  const hasConversation = conversation.some((message) => message.role === "user");
  if (!hasConversation && !providedRequirements.customerProblem)
    return NextResponse.json(
      { error: "Describe the automation you want to create." },
      { status: 400 },
    );
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
  const inferred = hasConversation
    ? inferAutomationRequirements(conversation, providedRequirements)
    : providedRequirements;
  const enhancedRequirements = hasConversation
    ? await enhanceInferredAutomationRequirements(conversation, inferred)
    : { requirements: inferred, source: "structured-template" as const };
  const requirements = sanitizeAutomationRequirements(
    enhancedRequirements.requirements,
  );
  const inferredSecrets = findAutomationSecrets(requirements, "requirements");
  if (inferredSecrets.length)
    return NextResponse.json(
      {
        error:
          "The inferred requirements contained a sensitive value and were rejected.",
        code: "SECRET_DETECTED",
      },
      { status: 400 },
    );
  const essentialQuestion = hasConversation
    ? getEssentialAutomationQuestion(requirements, conversation)
    : null;
  if (essentialQuestion)
    return NextResponse.json({
      ready: false,
      question: essentialQuestion,
      requirements,
      source: enhancedRequirements.source,
    });
  const errors = validateAutomationRequirements(requirements);
  if (errors.length) {
    if (hasConversation)
      return NextResponse.json({
        ready: false,
        question: "What should the workflow do after it starts?",
        requirements,
        source: enhancedRequirements.source,
      });
    return NextResponse.json({ error: errors[0], errors }, { status: 400 });
  }
  const basePlan = buildWorkflowPlan(requirements);
  const enhanced = await enhanceWorkflowPlan(requirements, basePlan);
  const plan = rebuildPlanConnections(enhanced.plan);
  const highRisk = findHighRiskRequests(requirements);
  return NextResponse.json({
    ready: true,
    question: null,
    requirements,
    plan,
    source:
      enhanced.source === "openai" || enhancedRequirements.source === "openai"
        ? "openai"
        : "structured-template",
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
