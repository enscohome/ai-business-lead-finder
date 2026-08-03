import type {
  AutomationRequirements,
  AutomationWorkflowPlan,
  FollowUpQuestion,
  SupportedNodeKey,
  WorkflowPlanNode,
} from "@/types/automation-workflow";
import { SUPPORTED_NODE_CATALOGUE } from "@/lib/automation-builder/catalogue";
import { findHighRiskRequests } from "@/lib/automation-builder/security";

const QUESTIONS: FollowUpQuestion[] = [
  {
    field: "customerProblem",
    question: "Describe the business problem you want to automate.",
  },
  { field: "projectName", question: "What should this automation project be called?" },
  { field: "businessType", question: "What type of business is this for?" },
  {
    field: "currentManualProcess",
    question: "How is this work handled manually today?",
  },
  { field: "desiredResult", question: "What result should the automation deliver?" },
  { field: "trigger", question: "What should start this workflow?" },
  {
    field: "inputData",
    question: "Where does the customer information or input data come from?",
  },
  {
    field: "applications",
    question: "Which applications or accounts will the workflow connect?",
  },
  { field: "actionsRequired", question: "What actions should the workflow perform?" },
  {
    field: "conditions",
    question: "Are there decision rules or conditions the workflow must follow?",
    optional: true,
  },
  { field: "desiredOutput", question: "Where should the final result be delivered?" },
  {
    field: "errorHandling",
    question: "What should happen when an operation fails?",
  },
  {
    field: "humanApproval",
    question: "Should a human approve anything before the workflow continues?",
    optional: true,
  },
  {
    field: "notifications",
    question: "Who should be notified, and through which application?",
    optional: true,
  },
  {
    field: "schedule",
    question: "How often should this run, if it is scheduled?",
    optional: true,
  },
  {
    field: "expectedExecutions",
    question: "Approximately how many executions do you expect?",
    optional: true,
  },
];

export function getFollowUpQuestions(
  requirements: AutomationRequirements,
): FollowUpQuestion[] {
  return QUESTIONS.filter((question) => {
    const value = requirements[question.field];
    if (Array.isArray(value)) return value.length === 0;
    if (value.trim()) return false;
    if (question.field === "schedule")
      return /schedule|daily|hour|week|month|cron|every/i.test(
        requirements.trigger,
      );
    if (question.field === "conditions")
      return /if|when|unless|only|approve|reject|different/i.test(
        `${requirements.customerProblem} ${requirements.actionsRequired}`,
      );
    if (question.field === "humanApproval")
      return /approve|review|payment|publish|send|delete|high.value/i.test(
        `${requirements.actionsRequired} ${requirements.desiredResult}`,
      );
    if (question.field === "notifications")
      return /notify|message|email|telegram|alert|failure|complete/i.test(
        `${requirements.actionsRequired} ${requirements.errorHandling}`,
      );
    return !question.optional;
  });
}

export function getAutomationCategory(
  requirements: AutomationRequirements,
): string {
  const text = `${requirements.customerProblem} ${requirements.actionsRequired} ${requirements.desiredResult}`.toLowerCase();
  if (/lead|prospect|crm|follow.?up|sales/.test(text)) return "Lead management";
  if (/invoice|payment|account|expense|finance/.test(text))
    return "Finance operations";
  if (/support|ticket|customer service|complaint/.test(text))
    return "Customer support";
  if (/social|campaign|marketing|content/.test(text)) return "Marketing";
  if (/sync|spreadsheet|database|record|data/.test(text)) return "Data operations";
  if (/notify|alert|message|email/.test(text)) return "Notifications";
  if (/openai|ai agent|classif|summari|extract/.test(text)) return "AI processing";
  return "Business process automation";
}

function node(key: SupportedNodeKey, name?: string, purpose?: string): WorkflowPlanNode {
  const definition = SUPPORTED_NODE_CATALOGUE[key];
  return {
    key,
    name: name || definition.label,
    purpose: purpose || definition.description,
    credential: definition.credential,
  };
}

function chooseTrigger(requirements: AutomationRequirements): SupportedNodeKey {
  const text = `${requirements.trigger} ${requirements.schedule}`.toLowerCase();
  if (/error|workflow fail/.test(text)) return "errorTrigger";
  if (/webhook|form|api|incoming|submission|new lead|new order/.test(text))
    return "webhook";
  if (/schedule|daily|hour|week|month|cron|every|morning|night/.test(text))
    return "scheduleTrigger";
  return "manualTrigger";
}

function appNodeKeys(requirements: AutomationRequirements): SupportedNodeKey[] {
  const text = requirements.applications.join(" ").toLowerCase();
  const result: SupportedNodeKey[] = [];
  if (/gmail|email|google mail/.test(text)) result.push("gmail");
  if (/google sheets|spreadsheet|sheets/.test(text)) result.push("googleSheets");
  if (/telegram/.test(text)) result.push("telegram");
  if (/openai|chatgpt|gpt|ai agent|language model/.test(text))
    result.push("openAiChatModel", "aiAgent", "structuredOutputParser");
  const recognised = /gmail|email|google mail|google sheets|spreadsheet|sheets|telegram|openai|chatgpt|gpt|ai agent|language model|n8n/gi;
  const remaining = text
    .replace(recognised, " ")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
  if (remaining || /api|crm|website|database/.test(requirements.actionsRequired))
    result.push("httpRequest");
  return Array.from(new Set(result));
}

function createConnections(nodes: WorkflowPlanNode[]) {
  const connections: AutomationWorkflowPlan["connections"] = [];
  const mainNodes = nodes.filter(
    (item) =>
      !["openAiChatModel", "structuredOutputParser", "stopAndError"].includes(
        item.key,
      ),
  );
  mainNodes.forEach((item, index) => {
    const next = mainNodes[index + 1];
    if (next)
      connections.push({ source: item.name, target: next.name, sourceOutput: 0 });
  });
  const agent = nodes.find((item) => item.key === "aiAgent");
  const model = nodes.find((item) => item.key === "openAiChatModel");
  const parser = nodes.find((item) => item.key === "structuredOutputParser");
  if (agent && model)
    connections.push({
      source: model.name,
      target: agent.name,
      type: "ai_languageModel",
      sourceOutput: 0,
    });
  if (agent && parser)
    connections.push({
      source: parser.name,
      target: agent.name,
      type: "ai_outputParser",
      sourceOutput: 0,
    });
  const condition = nodes.find((item) => item.key === "if");
  const stop = nodes.find((item) => item.key === "stopAndError");
  if (condition && stop)
    connections.push({
      source: condition.name,
      target: stop.name,
      sourceOutput: 1,
    });
  return connections;
}

export function buildWorkflowPlan(
  requirements: AutomationRequirements,
): AutomationWorkflowPlan {
  const triggerKey = chooseTrigger(requirements);
  const nodes: WorkflowPlanNode[] = [
    node(triggerKey),
    node("set", "Prepare Input Data", "Normalize and label incoming data using safe placeholder fields."),
  ];
  const hasConditions = Boolean(requirements.conditions.trim());
  if (hasConditions)
    nodes.push(
      node("if", "Check Business Rules", requirements.conditions),
    );
  if (/wait|delay|follow.?up|after \d+/i.test(requirements.actionsRequired))
    nodes.push(node("wait", "Wait Before Next Action"));
  const integrationKeys = appNodeKeys(requirements);
  const model = integrationKeys.includes("openAiChatModel");
  if (model) nodes.push(node("openAiChatModel"), node("aiAgent"), node("structuredOutputParser"));
  for (const key of integrationKeys) {
    if (["openAiChatModel", "aiAgent", "structuredOutputParser"].includes(key))
      continue;
    nodes.push(node(key));
  }
  if (triggerKey === "webhook") nodes.push(node("respondToWebhook"));
  if (hasConditions)
    nodes.push(
      node(
        "stopAndError",
        "Stop Unapproved Items",
        "Stop the false branch with a controlled explanation instead of continuing.",
      ),
    );
  const highRisk = findHighRiskRequests(requirements).length > 0;
  const credentials = Array.from(
    new Set(nodes.map((item) => item.credential).filter(Boolean)),
  ) as string[];
  const plan: AutomationWorkflowPlan = {
    workflowName: requirements.projectName,
    trigger: requirements.trigger,
    nodes,
    connections: [],
    dataFlow: `${requirements.inputData || "Incoming data"} is normalized, checked against the stated rules, passed only to approved integrations, and delivered as ${requirements.desiredOutput}.`,
    conditions: requirements.conditions || "No branching rule was specified.",
    requiredCredentials: credentials,
    errorPath:
      requirements.errorHandling ||
      "Stop safely, preserve the execution error, and let the user inspect it in n8n.",
    finalOutput: requirements.desiredOutput,
    manualReviewRequired: highRisk,
    compatibilityNotes: [
      `Target platform: n8n${requirements.n8nVersion ? ` ${requirements.n8nVersion}` : " (confirm the installed version before import)"}.`,
      "Connect credentials manually inside n8n after importing the workflow.",
      "Review placeholder field mappings, recipients, URLs, schedules, and business rules before activation.",
      "Review and test this workflow in a safe n8n environment before using it with real customer data.",
    ],
  };
  plan.connections = createConnections(nodes);
  return plan;
}

export function rebuildPlanConnections(
  plan: AutomationWorkflowPlan,
): AutomationWorkflowPlan {
  return { ...plan, connections: createConnections(plan.nodes) };
}
