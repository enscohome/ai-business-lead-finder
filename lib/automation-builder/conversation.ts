import type {
  AutomationConversationMessage,
  AutomationRequirements,
} from "../../types/automation-workflow";

const EMPTY_REQUIREMENTS: AutomationRequirements = {
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

const APP_PATTERNS = [
  { name: "WhatsApp", pattern: /\bwhats\s?app\b/i, group: "message" },
  { name: "Google Sheets", pattern: /\bgoogle sheets?\b|\bspreadsheet\b/i, group: "storage" },
  { name: "Airtable", pattern: /\bairtable\b/i, group: "storage" },
  { name: "HubSpot", pattern: /\bhubspot\b/i, group: "storage" },
  { name: "CRM", pattern: /\bcrm\b/i, group: "storage" },
  { name: "Database", pattern: /\bdatabase\b/i, group: "storage" },
  { name: "Telegram", pattern: /\btelegram\b/i, group: "message" },
  { name: "Slack", pattern: /\bslack\b/i, group: "message" },
  { name: "Gmail", pattern: /\bgmail\b|\bemail\b/i, group: "message" },
  { name: "Google Calendar", pattern: /\bgoogle calendar\b/i, group: "calendar" },
  { name: "Calendly", pattern: /\bcalendly\b/i, group: "calendar" },
  { name: "OpenAI", pattern: /\bopenai\b|\bchatgpt\b|\bai\b/i, group: "ai" },
  { name: "Paystack", pattern: /\bpaystack\b/i, group: "payment" },
  { name: "Stripe", pattern: /\bstripe\b/i, group: "payment" },
  { name: "Notion", pattern: /\bnotion\b/i, group: "storage" },
  { name: "Website", pattern: /\bwebsite\b|\bweb form\b|\blanding page\b/i, group: "source" },
  { name: "Facebook", pattern: /\bfacebook\b/i, group: "social" },
  { name: "Instagram", pattern: /\binstagram\b/i, group: "social" },
] as const;

function cleanText(value: unknown, max = 3000): string {
  return typeof value === "string"
    ? value
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max)
    : "";
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function sanitizeAutomationConversation(
  input: unknown,
): AutomationConversationMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(-30)
    .map((item): AutomationConversationMessage | null => {
      if (!item || typeof item !== "object") return null;
      const value = item as Record<string, unknown>;
      if (value.role !== "assistant" && value.role !== "user") return null;
      const content = cleanText(value.content, 3000);
      return content ? { role: value.role, content } : null;
    })
    .filter((item): item is AutomationConversationMessage => Boolean(item));
}

function titleFor(text: string): string {
  if (/customer service|customer support|common questions/i.test(text))
    return "AI Customer Service Automation";
  if (/lead|prospect|follow.?up/i.test(text))
    return "Lead Collection and Follow-up Automation";
  if (/appointment|booking|calendar/i.test(text))
    return "Appointment Booking Automation";
  if (/invoice|payment/i.test(text)) return "Payment and Invoice Automation";
  const words = text
    .replace(/^(?:please\s+)?(?:create|build|make|design)\s+(?:an?\s+)?/i, "")
    .replace(/\bn8n\b/gi, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  return `${words.join(" ") || "Customer Workflow"} Automation`.slice(0, 120);
}

function inferBusinessType(text: string, previous: string): string {
  const match = text.match(
    /\b(restaurant|clinic|hospital|school|agency|real estate|e-?commerce|online store|law firm|salon|hotel|consulting|construction|retail|freelance|customer service|sales)\b/i,
  );
  return match?.[1]
    ? `${match[1].charAt(0).toUpperCase()}${match[1].slice(1)} business`
    : previous || "Customer business";
}

function inferTrigger(text: string): string {
  if (/\b(every|daily|weekly|monthly|hourly|schedule|each morning|each night)\b/i.test(text))
    return "Scheduled trigger at the requested frequency";
  if (/\bwhats\s?app\b.*\b(message|reply)|\b(message|reply).*\bwhats\s?app\b/i.test(text))
    return "Incoming webhook when a new WhatsApp message is received";
  if (/\b(appointment|booking)\b/i.test(text))
    return "Incoming webhook when a new appointment request is received";
  if (/\b(new lead|lead form|form submission|new order|incoming|receives?|submitted?)\b/i.test(text))
    return "Incoming webhook when new customer information is received";
  if (/\bmanual(?:ly)?\b/i.test(text)) return "Manual trigger started by the user";
  return "Incoming webhook when new information is received";
}

function applyApplicationChanges(
  starting: string[],
  messages: AutomationConversationMessage[],
): string[] {
  let applications = unique(starting);
  for (const message of messages.filter((item) => item.role === "user")) {
    const text = message.content;
    const detected = APP_PATTERNS.filter((item) => item.pattern.test(text));
    if (/\binstead\b/i.test(text)) {
      const replacementGroups = new Set(detected.map((item) => item.group));
      applications = applications.filter((name) => {
        const definition = APP_PATTERNS.find((item) => item.name === name);
        return !definition || !replacementGroups.has(definition.group);
      });
    }
    applications = unique([
      ...applications,
      ...detected.map((item) => item.name),
    ]);
    for (const app of APP_PATTERNS) {
      const escaped = app.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const removal = new RegExp(
        `(?:remove|without|do not use|don't use|stop using|no longer use|instead of)\\s+(?:the\\s+)?${escaped}`,
        "i",
      );
      if (removal.test(text))
        applications = applications.filter((name) => name !== app.name);
    }
  }
  return applications;
}

function extractSchedule(text: string): string {
  const match = text.match(
    /\b(every\s+(?:\d+\s+)?(?:minute|hour|day|week|month)s?|daily|weekly|monthly|hourly|each morning|each night)\b/i,
  );
  return match?.[0] || "";
}

function extractConditions(text: string): string {
  const matches = text.match(
    /\b(?:if|only if|unless|when)\s+[^.!?]{4,180}/gi,
  );
  return matches ? unique(matches.map((item) => cleanText(item, 220))).join("; ") : "";
}

function hasAsked(
  conversation: AutomationConversationMessage[],
  question: string,
): boolean {
  return conversation.some(
    (message) =>
      message.role === "assistant" &&
      message.content.toLowerCase() === question.toLowerCase(),
  );
}

export function getEssentialAutomationQuestion(
  requirements: AutomationRequirements,
  conversation: AutomationConversationMessage[],
): string | null {
  const userText = conversation
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join(" ");
  const questions: Array<{ needed: boolean; question: string }> = [
    {
      needed: userText.split(/\s+/).filter(Boolean).length < 5,
      question: "What should the automation do for your customer?",
    },
    {
      needed:
        !/\b(every|daily|weekly|monthly|schedule|message|form|submission|new lead|new order|booking|appointment|receives?|incoming|manual|when)\b/i.test(
          userText,
        ),
      question: "What should start this automation?",
    },
    {
      needed:
        /\b(save|store|record|collect)\b/i.test(userText) &&
        !requirements.applications.some((app) =>
          ["Google Sheets", "Airtable", "HubSpot", "CRM", "Database", "Notion"].includes(app),
        ),
      question: "Where should the customer details be saved?",
    },
    {
      needed:
        /\b(notify|alert)\b/i.test(userText) &&
        !requirements.applications.some((app) =>
          ["WhatsApp", "Telegram", "Slack", "Gmail"].includes(app),
        ),
      question: "How should the workflow notify you?",
    },
    {
      needed:
        /\b(ai|assistant)\b[^.!?]{0,80}\b(reply|answer|respond)|\b(reply|answer|respond)\b[^.!?]{0,80}\bai\b/i.test(
          userText,
        ) &&
        /\b(draft|prepare|suggest)\b/i.test(userText) &&
        !/\b(automatic|automatically|approval|approve|review first|human review)\b/i.test(
          userText,
        ),
      question: "Should the AI reply automatically or wait for your approval?",
    },
  ];
  return (
    questions.find(
      (item) => item.needed && !hasAsked(conversation, item.question),
    )?.question || null
  );
}

export function inferAutomationRequirements(
  conversation: AutomationConversationMessage[],
  current?: AutomationRequirements,
): AutomationRequirements {
  const previous = current || EMPTY_REQUIREMENTS;
  const userMessages = conversation.filter((message) => message.role === "user");
  const userText = cleanText(
    userMessages.map((message) => message.content).join(". "),
    3000,
  );
  const latest = userMessages.at(-1)?.content || userText;
  const hasExistingContext = Boolean(previous.customerProblem);
  const combinedProblem = hasExistingContext
    ? cleanText(`${previous.customerProblem}. Requested updates: ${userText}`, 3000)
    : userText;
  const applications = applyApplicationChanges(
    previous.applications || [],
    conversation,
  );
  const storageApps = applications.filter((app) =>
    ["Google Sheets", "Airtable", "HubSpot", "CRM", "Database", "Notion"].includes(app),
  );
  const notificationApps = applications.filter((app) =>
    ["WhatsApp", "Telegram", "Slack", "Gmail"].includes(app),
  );
  const schedule = extractSchedule(userText) || previous.schedule;
  const conditions = extractConditions(userText) || previous.conditions;
  const automatic = /\bautomatic|automatically\b/i.test(userText);
  const approval = /\bapproval|approve|review first|human review\b/i.test(userText);
  const desiredOutput = cleanText(
    [
      storageApps.length ? `Customer information saved in ${storageApps.join(" and ")}` : "",
      notificationApps.length && /\bnotify|alert|send|email|message\b/i.test(userText)
        ? `notifications sent through ${notificationApps.join(" and ")}`
        : "",
      /\breply|answer|respond\b/i.test(userText) ? "the requested customer response delivered" : "",
    ]
      .filter(Boolean)
      .join(", ") || previous.desiredOutput || "The requested business process completed successfully",
    2000,
  );
  return {
    projectName: previous.projectName || titleFor(userText),
    clientName: previous.clientName,
    businessType: inferBusinessType(userText, previous.businessType),
    customerProblem: combinedProblem,
    currentManualProcess:
      previous.currentManualProcess ||
      "The customer currently handles this process manually across the named applications.",
    desiredResult: cleanText(
      hasExistingContext
        ? `${previous.desiredResult}. Apply these updates: ${latest}`
        : `Automate this request safely: ${userText}`,
      2000,
    ),
    trigger: inferTrigger(userText),
    inputData:
      previous.inputData ||
      (/\bmessage|question\b/i.test(userText)
        ? "The incoming customer message and available contact details"
        : /\blead\b/i.test(userText)
          ? "The new lead's submitted contact and enquiry details"
          : /\bappointment|booking\b/i.test(userText)
            ? "The customer's appointment request and contact details"
            : "The information supplied when the workflow starts"),
    applications,
    actionsRequired: cleanText(
      hasExistingContext
        ? `${previous.actionsRequired}. Apply these updates: ${latest}`
        : userText,
      3000,
    ),
    conditions,
    desiredOutput,
    schedule,
    expectedExecutions: previous.expectedExecutions,
    errorHandling:
      previous.errorHandling ||
      `Stop safely, record the error in n8n${notificationApps.length ? `, and alert the user through ${notificationApps[0]}` : " for review"}.`,
    notifications:
      notificationApps.length && /\bnotify|alert|send|email|message\b/i.test(userText)
        ? `Send the requested notifications through ${notificationApps.join(" and ")}.`
        : previous.notifications,
    sampleData: previous.sampleData,
    n8nVersion: previous.n8nVersion,
    humanApproval: approval
      ? "Wait for human approval before the requested action."
      : automatic
        ? "Continue automatically without human approval."
        : previous.humanApproval,
  };
}
