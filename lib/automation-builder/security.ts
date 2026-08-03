import type {
  AutomationRequirements,
  AutomationWorkflowPlan,
  WorkflowPlanNode,
} from "@/types/automation-workflow";
import {
  isSupportedNodeKey,
  SUPPORTED_NODE_CATALOGUE,
} from "@/lib/automation-builder/catalogue";

const SECRET_PATTERNS = [
  /\bsk_(?:live|test)_[A-Za-z0-9_-]{8,}\b/i,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/i,
  /\bpk_(?:live|test)_[A-Za-z0-9_-]{12,}\b/i,
  /\b(?:password|passwd|api[_ -]?key|client[_ -]?secret|private[_ -]?key|access[_ -]?token|refresh[_ -]?token|service[_ -]?role)\s*[:=]\s*\S{8,}/i,
  /\bBearer\s+[A-Za-z0-9._~+\/-]{12,}/i,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
];

const HIGH_RISK_REQUEST_PATTERNS = [
  /\bexecute\s+(?:a\s+)?(?:shell|system|terminal|command)\b/i,
  /\bssh\b/i,
  /\blocal\s+file\s+(?:trigger|system|read|write)\b/i,
  /\b(?:read|write|delete)\s+(?:a\s+)?(?:local|system)\s+file\b/i,
  /\bcommunity\s+node\b/i,
  /\b(?:powershell|bash|cmd\.exe|child_process|process\.env)\b/i,
];

export function cleanAutomationText(value: unknown, max = 2000): string {
  return typeof value === "string"
    ? value
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max)
    : "";
}

export function cleanAutomationList(
  value: unknown,
  maxItems = 20,
  maxLength = 120,
): string[] {
  const input = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]/)
      : [];
  return Array.from(
    new Set(
      input
        .slice(0, maxItems)
        .map((item) => cleanAutomationText(item, maxLength))
        .filter(Boolean),
    ),
  );
}

export const EMPTY_AUTOMATION_REQUIREMENTS: AutomationRequirements = {
  projectName: "",
  clientName: "",
  businessType: "",
  customerProblem: "",
  currentManualProcess: "",
  desiredResult: "",
  trigger: "",
  inputData: "",
  applications: [],
  actionsRequired: "",
  conditions: "",
  desiredOutput: "",
  schedule: "",
  expectedExecutions: "",
  errorHandling: "",
  notifications: "",
  sampleData: "",
  n8nVersion: "",
  humanApproval: "",
};

export function sanitizeAutomationRequirements(
  input: unknown,
): AutomationRequirements {
  const value =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};
  return {
    projectName: cleanAutomationText(value.projectName, 120),
    clientName: cleanAutomationText(value.clientName, 120),
    businessType: cleanAutomationText(value.businessType, 120),
    customerProblem: cleanAutomationText(value.customerProblem, 3000),
    currentManualProcess: cleanAutomationText(value.currentManualProcess, 3000),
    desiredResult: cleanAutomationText(value.desiredResult, 2000),
    trigger: cleanAutomationText(value.trigger, 800),
    inputData: cleanAutomationText(value.inputData, 2000),
    applications: cleanAutomationList(value.applications),
    actionsRequired: cleanAutomationText(value.actionsRequired, 3000),
    conditions: cleanAutomationText(value.conditions, 2000),
    desiredOutput: cleanAutomationText(value.desiredOutput, 2000),
    schedule: cleanAutomationText(value.schedule, 500),
    expectedExecutions: cleanAutomationText(value.expectedExecutions, 300),
    errorHandling: cleanAutomationText(value.errorHandling, 1500),
    notifications: cleanAutomationText(value.notifications, 1500),
    sampleData: cleanAutomationText(value.sampleData, 3000),
    n8nVersion: cleanAutomationText(value.n8nVersion, 80),
    humanApproval: cleanAutomationText(value.humanApproval, 800),
  };
}

export function validateAutomationRequirements(
  input: AutomationRequirements,
): string[] {
  const errors: string[] = [];
  if (!input.projectName) errors.push("Project name is required.");
  if (!input.businessType) errors.push("Business type is required.");
  if (!input.customerProblem)
    errors.push("Describe the customer problem to automate.");
  if (!input.desiredResult) errors.push("Desired result is required.");
  if (!input.trigger) errors.push("Workflow trigger is required.");
  if (!input.actionsRequired) errors.push("Required actions are missing.");
  if (!input.desiredOutput) errors.push("Desired output is required.");
  if (!input.errorHandling)
    errors.push("Describe what should happen when an operation fails.");
  return errors;
}

export function findAutomationSecrets(
  input: unknown,
  prefix = "",
): string[] {
  if (typeof input === "string")
    return SECRET_PATTERNS.some((pattern) => pattern.test(input))
      ? [prefix || "input"]
      : [];
  if (Array.isArray(input))
    return input.flatMap((item, index) =>
      findAutomationSecrets(item, `${prefix}[${index}]`),
    );
  if (!input || typeof input !== "object") return [];
  return Object.entries(input as Record<string, unknown>).flatMap(
    ([key, item]) =>
      findAutomationSecrets(item, prefix ? `${prefix}.${key}` : key),
  );
}

export function findHighRiskRequests(input: AutomationRequirements): string[] {
  const combined = Object.values(input)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .join(" ");
  return HIGH_RISK_REQUEST_PATTERNS.filter((pattern) => pattern.test(combined))
    .map((pattern) => pattern.source)
    .slice(0, 5);
}

function uniqueName(name: string, existing: Set<string>): string {
  const base = cleanAutomationText(name, 100) || "Workflow Step";
  let candidate = base;
  let suffix = 2;
  while (existing.has(candidate.toLowerCase())) {
    candidate = `${base} ${suffix}`;
    suffix += 1;
  }
  existing.add(candidate.toLowerCase());
  return candidate;
}

export function sanitizeWorkflowPlan(
  input: unknown,
  fallback: AutomationWorkflowPlan,
): AutomationWorkflowPlan {
  const value =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};
  const names = new Set<string>();
  const rawNodes = Array.isArray(value.nodes) ? value.nodes : fallback.nodes;
  const nodes = rawNodes
    .slice(0, 30)
    .map((item): WorkflowPlanNode | null => {
      if (!item || typeof item !== "object") return null;
      const node = item as Record<string, unknown>;
      if (!isSupportedNodeKey(node.key)) return null;
      const definition = SUPPORTED_NODE_CATALOGUE[node.key];
      return {
        key: node.key,
        name: uniqueName(
          cleanAutomationText(node.name, 100) || definition.label,
          names,
        ),
        purpose:
          cleanAutomationText(node.purpose, 600) || definition.description,
        credential: definition.credential,
      };
    })
    .filter((node): node is WorkflowPlanNode => Boolean(node));
  const effectiveNodes = nodes.length ? nodes : fallback.nodes;
  const credentials = Array.from(
    new Set(effectiveNodes.map((node) => node.credential).filter(Boolean)),
  ) as string[];
  return {
    workflowName:
      cleanAutomationText(value.workflowName, 120) || fallback.workflowName,
    trigger: cleanAutomationText(value.trigger, 800) || fallback.trigger,
    nodes: effectiveNodes,
    connections: fallback.connections,
    dataFlow: cleanAutomationText(value.dataFlow, 2000) || fallback.dataFlow,
    conditions:
      cleanAutomationText(value.conditions, 1500) || fallback.conditions,
    requiredCredentials: credentials,
    errorPath:
      cleanAutomationText(value.errorPath, 1500) || fallback.errorPath,
    finalOutput:
      cleanAutomationText(value.finalOutput, 1500) || fallback.finalOutput,
    manualReviewRequired:
      value.manualReviewRequired === true || fallback.manualReviewRequired,
    compatibilityNotes: cleanAutomationList(
      value.compatibilityNotes,
      12,
      400,
    ).length
      ? cleanAutomationList(value.compatibilityNotes, 12, 400)
      : fallback.compatibilityNotes,
  };
}

export function automationSlug(value: string): string {
  return (
    cleanAutomationText(value, 120)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "n8n-automation"
  );
}
