import type {
  SupportedNodeDefinition,
  SupportedNodeKey,
} from "@/types/automation-workflow";

export const SUPPORTED_NODE_CATALOGUE: Record<
  SupportedNodeKey,
  SupportedNodeDefinition
> = {
  manualTrigger: {
    key: "manualTrigger",
    label: "Manual Trigger",
    type: "n8n-nodes-base.manualTrigger",
    typeVersion: 1,
    category: "trigger",
    credential: null,
    description: "Starts a workflow manually while it is being configured or tested.",
    isTrigger: true,
  },
  webhook: {
    key: "webhook",
    label: "Webhook",
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    category: "trigger",
    credential: null,
    description: "Starts a workflow when an external service sends an HTTP request.",
    isTrigger: true,
  },
  respondToWebhook: {
    key: "respondToWebhook",
    label: "Respond to Webhook",
    type: "n8n-nodes-base.respondToWebhook",
    typeVersion: 1.4,
    category: "integration",
    credential: null,
    description: "Returns a controlled response to the webhook caller.",
  },
  scheduleTrigger: {
    key: "scheduleTrigger",
    label: "Schedule Trigger",
    type: "n8n-nodes-base.scheduleTrigger",
    typeVersion: 1.2,
    category: "trigger",
    credential: null,
    description: "Starts a workflow on a configured schedule.",
    isTrigger: true,
  },
  httpRequest: {
    key: "httpRequest",
    label: "HTTP Request",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    category: "integration",
    credential: "API or OAuth credential for the selected service",
    description: "Calls a service API using credentials connected inside n8n.",
  },
  set: {
    key: "set",
    label: "Edit Fields",
    type: "n8n-nodes-base.set",
    typeVersion: 3.4,
    category: "data",
    credential: null,
    description: "Renames, adds, or prepares fields for later nodes.",
  },
  if: {
    key: "if",
    label: "IF",
    type: "n8n-nodes-base.if",
    typeVersion: 2.2,
    category: "logic",
    credential: null,
    description: "Routes items through true or false branches.",
  },
  switch: {
    key: "switch",
    label: "Switch",
    type: "n8n-nodes-base.switch",
    typeVersion: 3.2,
    category: "logic",
    credential: null,
    description: "Routes items through multiple controlled outcomes.",
  },
  merge: {
    key: "merge",
    label: "Merge",
    type: "n8n-nodes-base.merge",
    typeVersion: 3.2,
    category: "logic",
    credential: null,
    description: "Combines data from two workflow branches.",
  },
  wait: {
    key: "wait",
    label: "Wait",
    type: "n8n-nodes-base.wait",
    typeVersion: 1.1,
    category: "logic",
    credential: null,
    description: "Pauses execution for a configured period or event.",
  },
  gmail: {
    key: "gmail",
    label: "Gmail",
    type: "n8n-nodes-base.gmail",
    typeVersion: 2.1,
    category: "integration",
    credential: "Gmail OAuth2",
    description: "Sends or manages email through a connected Gmail account.",
  },
  googleSheets: {
    key: "googleSheets",
    label: "Google Sheets",
    type: "n8n-nodes-base.googleSheets",
    typeVersion: 4.6,
    category: "integration",
    credential: "Google Sheets OAuth2",
    description: "Reads or writes spreadsheet rows using a connected Google account.",
  },
  telegram: {
    key: "telegram",
    label: "Telegram",
    type: "n8n-nodes-base.telegram",
    typeVersion: 1.2,
    category: "integration",
    credential: "Telegram bot credential",
    description: "Sends a controlled message through a connected Telegram bot.",
  },
  openAiChatModel: {
    key: "openAiChatModel",
    label: "OpenAI Chat Model",
    type: "@n8n/n8n-nodes-langchain.lmChatOpenAi",
    typeVersion: 1.2,
    category: "ai",
    credential: "OpenAI API credential configured in n8n",
    description: "Provides the language model for an AI Agent.",
    connectionType: "ai_languageModel",
  },
  aiAgent: {
    key: "aiAgent",
    label: "AI Agent",
    type: "@n8n/n8n-nodes-langchain.agent",
    typeVersion: 1.7,
    category: "ai",
    credential: null,
    description: "Uses a connected model to perform a tightly described AI task.",
  },
  structuredOutputParser: {
    key: "structuredOutputParser",
    label: "Structured Output Parser",
    type: "@n8n/n8n-nodes-langchain.outputParserStructured",
    typeVersion: 1.2,
    category: "ai",
    credential: null,
    description: "Validates that AI output follows the expected JSON shape.",
    connectionType: "ai_outputParser",
  },
  stopAndError: {
    key: "stopAndError",
    label: "Stop And Error",
    type: "n8n-nodes-base.stopAndError",
    typeVersion: 1,
    category: "error",
    credential: null,
    description: "Stops execution with a clear controlled error.",
  },
  errorTrigger: {
    key: "errorTrigger",
    label: "Error Trigger",
    type: "n8n-nodes-base.errorTrigger",
    typeVersion: 1,
    category: "trigger",
    credential: null,
    description: "Starts a dedicated error workflow when another workflow fails.",
    isTrigger: true,
  },
};

export const SUPPORTED_NODE_KEYS = Object.keys(
  SUPPORTED_NODE_CATALOGUE,
) as SupportedNodeKey[];

export const SUPPORTED_NODE_TYPES = new Set(
  SUPPORTED_NODE_KEYS.map((key) => SUPPORTED_NODE_CATALOGUE[key].type),
);

export const TRIGGER_NODE_TYPES = new Set(
  SUPPORTED_NODE_KEYS.filter(
    (key) => SUPPORTED_NODE_CATALOGUE[key].isTrigger,
  ).map((key) => SUPPORTED_NODE_CATALOGUE[key].type),
);

export const HIGH_RISK_NODE_TYPES = new Set([
  "n8n-nodes-base.executeCommand",
  "n8n-nodes-base.ssh",
  "n8n-nodes-base.localFileTrigger",
  "n8n-nodes-base.readWriteFile",
  "n8n-nodes-base.code",
  "n8n-nodes-base.function",
  "n8n-nodes-base.functionItem",
]);

export function isSupportedNodeKey(value: unknown): value is SupportedNodeKey {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(SUPPORTED_NODE_CATALOGUE, value)
  );
}
