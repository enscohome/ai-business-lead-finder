export type AutomationProjectStatus =
  | "draft"
  | "planned"
  | "generated"
  | "validation_failed";

export type AutomationValidationStatus =
  | "not_validated"
  | "valid"
  | "invalid";

export interface AutomationRequirements {
  projectName: string;
  clientName: string;
  businessType: string;
  customerProblem: string;
  currentManualProcess: string;
  desiredResult: string;
  trigger: string;
  inputData: string;
  applications: string[];
  actionsRequired: string;
  conditions: string;
  desiredOutput: string;
  schedule: string;
  expectedExecutions: string;
  errorHandling: string;
  notifications: string;
  sampleData: string;
  n8nVersion: string;
  humanApproval: string;
}

export interface AutomationConversationMessage {
  role: "assistant" | "user";
  content: string;
}

export type SupportedNodeKey =
  | "manualTrigger"
  | "webhook"
  | "respondToWebhook"
  | "scheduleTrigger"
  | "httpRequest"
  | "set"
  | "if"
  | "switch"
  | "merge"
  | "wait"
  | "gmail"
  | "googleSheets"
  | "telegram"
  | "openAiChatModel"
  | "aiAgent"
  | "structuredOutputParser"
  | "stopAndError"
  | "errorTrigger";

export interface SupportedNodeDefinition {
  key: SupportedNodeKey;
  label: string;
  type: string;
  typeVersion: number;
  category: "trigger" | "logic" | "data" | "integration" | "ai" | "error";
  credential: string | null;
  description: string;
  isTrigger?: boolean;
  connectionType?: "main" | "ai_languageModel" | "ai_outputParser";
}

export interface WorkflowPlanNode {
  key: SupportedNodeKey;
  name: string;
  purpose: string;
  credential: string | null;
}

export interface WorkflowPlanConnection {
  source: string;
  target: string;
  sourceOutput?: number;
  type?: "main" | "ai_languageModel" | "ai_outputParser";
}

export interface AutomationWorkflowPlan {
  workflowName: string;
  trigger: string;
  nodes: WorkflowPlanNode[];
  connections: WorkflowPlanConnection[];
  dataFlow: string;
  conditions: string;
  requiredCredentials: string[];
  errorPath: string;
  finalOutput: string;
  manualReviewRequired: boolean;
  compatibilityNotes: string[];
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
}

export interface N8nConnectionTarget {
  node: string;
  type: string;
  index: number;
}

export interface N8nWorkflow {
  name: string;
  nodes: N8nNode[];
  connections: Record<
    string,
    Record<string, N8nConnectionTarget[][]>
  >;
  active: false;
  settings: Record<string, unknown>;
  pinData: Record<string, unknown>;
  meta: Record<string, unknown>;
  tags: unknown[];
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  repaired: boolean;
}

export interface AutomationArtifact {
  requirements: AutomationRequirements;
  plan: AutomationWorkflowPlan;
  workflow: N8nWorkflow;
  summary: string;
  requiredCredentials: string[];
  testingInstructions: string[];
  validation: WorkflowValidationResult;
  source: "openai" | "structured-template";
}

export interface AutomationWorkflowProject {
  id: string;
  project_name: string;
  client_name: string;
  business_type: string;
  automation_category: string;
  customer_problem: string;
  requirements: AutomationRequirements;
  workflow_plan: AutomationWorkflowPlan;
  generated_workflow: N8nWorkflow;
  workflow_summary: string;
  required_credentials: string[];
  supported_nodes: SupportedNodeKey[];
  validation_status: AutomationValidationStatus;
  validation_errors: string[];
  target_platform: "n8n";
  target_n8n_version: string | null;
  generation_count: number;
  status: AutomationProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface FollowUpQuestion {
  field: keyof AutomationRequirements;
  question: string;
  optional?: boolean;
}
