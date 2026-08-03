import type {
  AutomationConversationMessage,
  AutomationRequirements,
  AutomationWorkflowPlan,
} from "@/types/automation-workflow";
import {
  cleanAutomationList,
  cleanAutomationText,
  findAutomationSecrets,
  sanitizeAutomationRequirements,
} from "@/lib/automation-builder/security";

export async function enhanceInferredAutomationRequirements(
  conversation: AutomationConversationMessage[],
  fallback: AutomationRequirements,
): Promise<{
  requirements: AutomationRequirements;
  source: "openai" | "structured-template";
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    return { requirements: fallback, source: "structured-template" };
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_PROMPT_BUILDER_MODEL || "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 1800,
        messages: [
          {
            role: "system",
            content:
              "Convert a beginner's conversation into structured n8n automation requirements. Return JSON with one object named requirements containing only: projectName, clientName, businessType, customerProblem, currentManualProcess, desiredResult, trigger, inputData, applications, actionsRequired, conditions, desiredOutput, schedule, expectedExecutions, errorHandling, notifications, sampleData, n8nVersion, humanApproval. Infer ordinary details instead of asking technical questions. Respect later corrections such as remove, add, or use another app instead. Never invent credentials, URLs, tokens, private data, unsupported code, or an n8n version. Preserve uncertainty in plain language.",
          },
          {
            role: "user",
            content: JSON.stringify({ conversation, safeFallback: fallback }),
          },
        ],
      }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("AI requirements request failed");
    const payload = await response.json();
    const parsed = JSON.parse(payload.choices?.[0]?.message?.content || "{}");
    const raw =
      parsed.requirements && typeof parsed.requirements === "object"
        ? (parsed.requirements as Record<string, unknown>)
        : {};
    const candidate = sanitizeAutomationRequirements({ ...fallback, ...raw });
    const requirements: AutomationRequirements = {
      ...candidate,
      projectName: candidate.projectName || fallback.projectName,
      businessType: candidate.businessType || fallback.businessType,
      customerProblem: candidate.customerProblem || fallback.customerProblem,
      currentManualProcess:
        candidate.currentManualProcess || fallback.currentManualProcess,
      desiredResult: candidate.desiredResult || fallback.desiredResult,
      trigger: candidate.trigger || fallback.trigger,
      inputData: candidate.inputData || fallback.inputData,
      applications: fallback.applications,
      actionsRequired:
        candidate.actionsRequired || fallback.actionsRequired,
      desiredOutput: candidate.desiredOutput || fallback.desiredOutput,
      errorHandling: candidate.errorHandling || fallback.errorHandling,
      n8nVersion: fallback.n8nVersion,
    };
    if (findAutomationSecrets(requirements).length)
      return { requirements: fallback, source: "structured-template" };
    return { requirements, source: "openai" };
  } catch {
    return { requirements: fallback, source: "structured-template" };
  }
}

export async function enhanceWorkflowPlan(
  requirements: AutomationRequirements,
  basePlan: AutomationWorkflowPlan,
): Promise<{
  plan: AutomationWorkflowPlan;
  source: "openai" | "structured-template";
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { plan: basePlan, source: "structured-template" };
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_PROMPT_BUILDER_MODEL || "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 2200,
        messages: [
          {
            role: "system",
            content:
              "You improve a pre-approved n8n workflow plan. Return JSON with only workflowName, dataFlow, conditions, errorPath, finalOutput, compatibilityNotes, and nodePurposes. nodePurposes must be an object keyed by the supplied node names. Do not add nodes, credentials, URLs, headers, expressions, or secrets. Keep every supplied fact and state uncertainty plainly.",
          },
          {
            role: "user",
            content: JSON.stringify({ requirements, approvedPlan: basePlan }),
          },
        ],
      }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("AI plan request failed");
    const payload = await response.json();
    const parsed = JSON.parse(payload.choices?.[0]?.message?.content || "{}");
    const purposes =
      parsed.nodePurposes && typeof parsed.nodePurposes === "object"
        ? (parsed.nodePurposes as Record<string, unknown>)
        : {};
    const notes = cleanAutomationList(parsed.compatibilityNotes, 12, 400);
    return {
      source: "openai",
      plan: {
        ...basePlan,
        workflowName:
          cleanAutomationText(parsed.workflowName, 120) ||
          basePlan.workflowName,
        dataFlow:
          cleanAutomationText(parsed.dataFlow, 2000) || basePlan.dataFlow,
        conditions:
          cleanAutomationText(parsed.conditions, 1500) || basePlan.conditions,
        errorPath:
          cleanAutomationText(parsed.errorPath, 1500) || basePlan.errorPath,
        finalOutput:
          cleanAutomationText(parsed.finalOutput, 1500) ||
          basePlan.finalOutput,
        compatibilityNotes: notes.length
          ? notes
          : basePlan.compatibilityNotes,
        nodes: basePlan.nodes.map((node) => ({
          ...node,
          purpose:
            cleanAutomationText(purposes[node.name], 600) || node.purpose,
        })),
      },
    };
  } catch {
    return { plan: basePlan, source: "structured-template" };
  }
}
