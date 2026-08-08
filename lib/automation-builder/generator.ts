import type {
  AutomationArtifact,
  AutomationRequirements,
  AutomationWorkflowPlan,
  N8nConnectionTarget,
  N8nNode,
  N8nWorkflow,
  SupportedNodeKey,
} from "@/types/automation-workflow";
import { SUPPORTED_NODE_CATALOGUE } from "@/lib/automation-builder/catalogue";
import { automationSlug } from "@/lib/automation-builder/security";

function nodeParameters(
  key: SupportedNodeKey,
  requirements: AutomationRequirements,
): Record<string, unknown> {
  switch (key) {
    case "webhook":
      return {
        httpMethod: "POST",
        path: `${automationSlug(requirements.projectName)}-replace-me`,
        responseMode: "responseNode",
        options: {},
      };
    case "respondToWebhook":
      return {
        respondWith: "json",
        responseBody: '{ "ok": true, "message": "Workflow completed" }',
        options: {},
      };
    case "scheduleTrigger":
      return {
        rule: { interval: [{ field: "hours", hoursInterval: 1 }] },
      };
    case "httpRequest":
      return {
        method: "GET",
        url: "https://api.example.com/replace-with-approved-endpoint",
        authentication: "none",
        sendHeaders: false,
        options: { timeout: 30000 },
      };
    case "set":
      return {
        assignments: {
          assignments: [
            {
              id: "prepared-at",
              name: "preparedAt",
              value: "={{ $now }}",
              type: "string",
            },
            {
              id: "workflow-purpose",
              name: "workflowPurpose",
              value: requirements.desiredResult,
              type: "string",
            },
          ],
        },
        options: {},
      };
    case "if":
      return {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "strict",
            version: 2,
          },
          conditions: [
            {
              id: "business-rule",
              leftValue: "={{ $json.status }}",
              rightValue: "approved",
              operator: { type: "string", operation: "equals" },
            },
          ],
          combinator: "and",
        },
        options: {},
      };
    case "switch":
      return {
        rules: {
          values: [
            {
              conditions: {
                options: { caseSensitive: true, typeValidation: "strict", version: 2 },
                conditions: [
                  {
                    leftValue: "={{ $json.status }}",
                    rightValue: "approved",
                    operator: { type: "string", operation: "equals" },
                  },
                ],
                combinator: "and",
              },
            },
          ],
        },
        options: {},
      };
    case "merge":
      return { mode: "append" };
    case "wait":
      return { amount: 1, unit: "minutes" };
    case "gmail":
      return {
        sendTo: "recipient@example.com",
        subject: `Replace with approved subject: ${requirements.projectName}`,
        message: "={{ $json.message || 'Replace with an approved message' }}",
        options: { appendAttribution: true },
      };
    case "googleSheets":
      return {
        operation: "append",
        documentId: {
          __rl: true,
          value: "REPLACE_WITH_SPREADSHEET_ID",
          mode: "id",
        },
        sheetName: {
          __rl: true,
          value: "REPLACE_WITH_SHEET_NAME",
          mode: "name",
        },
        columns: {
          mappingMode: "autoMapInputData",
          value: {},
          matchingColumns: [],
          schema: [],
        },
        options: {},
      };
    case "telegram":
      return {
        chatId: "REPLACE_WITH_CHAT_ID",
        text: "={{ $json.message || 'Replace with an approved notification' }}",
        additionalFields: {},
      };
    case "openAiChatModel":
      return { options: {} };
    case "aiAgent":
      return {
        promptType: "define",
        text: "={{ $json.input || $json.customerProblem }}",
        options: {
          systemMessage:
            "Process only the supplied business data. Return the requested result without inventing private facts.",
        },
      };
    case "structuredOutputParser":
      return {
        jsonSchemaExample:
          '{ "result": "string", "status": "approved or rejected" }',
      };
    case "stopAndError":
      return {
        errorMessage:
          "Workflow stopped because a required business rule was not satisfied.",
      };
    case "manualTrigger":
    case "errorTrigger":
    default:
      return {};
  }
}

function addConnection(
  connections: N8nWorkflow["connections"],
  source: string,
  target: string,
  sourceOutput: number,
  type: string,
) {
  connections[source] ||= {};
  connections[source][type] ||= [];
  while (connections[source][type].length <= sourceOutput)
    connections[source][type].push([]);
  const destination: N8nConnectionTarget = { node: target, type, index: 0 };
  connections[source][type][sourceOutput].push(destination);
}

export function compileN8nWorkflow(
  requirements: AutomationRequirements,
  plan: AutomationWorkflowPlan,
): N8nWorkflow {
  const nodes: N8nNode[] = plan.nodes.map((planned, index) => {
    const definition = SUPPORTED_NODE_CATALOGUE[planned.key];
    const special = ["openAiChatModel", "structuredOutputParser"].includes(
      planned.key,
    );
    return {
      id: `${String(index + 1).padStart(2, "0")}-${automationSlug(planned.name)}`,
      name: planned.name,
      type: definition.type,
      typeVersion: definition.typeVersion,
      position: special
        ? [620, planned.key === "openAiChatModel" ? 500 : 680]
        : [220 + (index % 4) * 280, 160 + Math.floor(index / 4) * 220],
      parameters: nodeParameters(planned.key, requirements),
    };
  });
  const connections: N8nWorkflow["connections"] = {};
  for (const connection of plan.connections) {
    addConnection(
      connections,
      connection.source,
      connection.target,
      Math.max(0, connection.sourceOutput || 0),
      connection.type || "main",
    );
  }
  return {
    name: plan.workflowName,
    nodes,
    connections,
    active: false,
    settings: { executionOrder: "v1" },
    pinData: {},
    meta: { templateCredsSetupCompleted: false },
    tags: [],
  };
}

export function buildWorkflowSummary(
  requirements: AutomationRequirements,
  plan: AutomationWorkflowPlan,
) {
  return `${plan.workflowName} is an n8n workflow for ${requirements.businessType}. It starts when ${requirements.trigger}, processes ${requirements.inputData || "the supplied input"}, performs ${requirements.actionsRequired}, and delivers ${requirements.desiredOutput}. It uses ${plan.nodes.length} controlled nodes and requires ${plan.requiredCredentials.length ? plan.requiredCredentials.join(", ") : "no external credentials until integrations are configured"}.`;
}

export function buildTestingInstructions(
  requirements: AutomationRequirements,
  plan: AutomationWorkflowPlan,
): string[] {
  return [
    "Import the JSON into a separate n8n test project with the workflow inactive.",
    "Open every node and replace each REPLACE_WITH placeholder with approved non-secret configuration.",
    `Connect only these credentials inside n8n: ${plan.requiredCredentials.join(", ") || "none required by the current plan"}.`,
    `Use synthetic test data${requirements.sampleData ? " shaped like the supplied example" : " that contains no real customer information"}.`,
    `Confirm the trigger behaves as expected: ${requirements.trigger}.`,
    `Test the normal path and verify this output: ${requirements.desiredOutput}.`,
    `Force one failure and verify the error behaviour: ${requirements.errorHandling}.`,
    "Inspect n8n execution logs for unexpected fields, retries, duplicate actions, and exposed data.",
    "Keep the workflow inactive until a human has reviewed recipients, URLs, schedules, permissions, and credentials.",
  ];
}

export function buildAutomationArtifact(
  requirements: AutomationRequirements,
  plan: AutomationWorkflowPlan,
): Omit<AutomationArtifact, "validation" | "source"> {
  return {
    requirements,
    plan,
    workflow: compileN8nWorkflow(requirements, plan),
    summary: buildWorkflowSummary(requirements, plan),
    requiredCredentials: plan.requiredCredentials,
    testingInstructions: buildTestingInstructions(requirements, plan),
  };
}
