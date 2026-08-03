import type {
  AutomationRequirements,
  AutomationWorkflowPlan,
} from "@/types/automation-workflow";
import { cleanAutomationList, cleanAutomationText } from "@/lib/automation-builder/security";

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
