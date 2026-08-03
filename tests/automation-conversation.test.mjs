import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";

const root = process.cwd();
const conversationSource = readFileSync(
  join(root, "lib/automation-builder/conversation.ts"),
  "utf8",
);
const compiledConversation = ts.transpileModule(conversationSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const conversationModule = await import(
  `data:text/javascript;base64,${Buffer.from(compiledConversation).toString("base64")}`
);

const {
  getEssentialAutomationQuestion,
  inferAutomationRequirements,
  sanitizeAutomationConversation,
} = conversationModule;

test("one complete beginner prompt infers structured requirements without a form", () => {
  const conversation = sanitizeAutomationConversation([
    {
      role: "user",
      content:
        "Create an n8n workflow that receives WhatsApp customer messages, answers common questions automatically using AI, saves customer details to Google Sheets, and alerts me on Telegram when a customer wants to place an order.",
    },
  ]);
  const requirements = inferAutomationRequirements(conversation);
  assert.equal(getEssentialAutomationQuestion(requirements, conversation), null);
  assert.match(requirements.projectName, /Customer Service/i);
  assert.match(requirements.trigger, /WhatsApp/i);
  assert.deepEqual(requirements.applications, [
    "WhatsApp",
    "Google Sheets",
    "Telegram",
    "OpenAI",
  ]);
  assert.ok(requirements.actionsRequired.length > 20);
  assert.ok(requirements.desiredResult.length > 20);
  assert.equal(requirements.n8nVersion, "");
});

test("only one essential follow-up is returned at a time", () => {
  const conversation = sanitizeAutomationConversation([
    { role: "user", content: "Collect customer leads and notify me." },
  ]);
  const requirements = inferAutomationRequirements(conversation);
  assert.equal(
    getEssentialAutomationQuestion(requirements, conversation),
    "What should start this automation?",
  );

  const withAnswer = sanitizeAutomationConversation([
    ...conversation,
    { role: "assistant", content: "What should start this automation?" },
    { role: "user", content: "When a website form is submitted." },
  ]);
  const updated = inferAutomationRequirements(withAnswer, requirements);
  assert.equal(
    getEssentialAutomationQuestion(updated, withAnswer),
    "Where should the customer details be saved?",
  );

  const withStorage = sanitizeAutomationConversation([
    ...withAnswer,
    {
      role: "assistant",
      content: "Where should the customer details be saved?",
    },
    { role: "user", content: "Save them in Google Sheets." },
  ]);
  const readyForNotification = inferAutomationRequirements(withStorage, updated);
  assert.equal(
    getEssentialAutomationQuestion(readyForNotification, withStorage),
    "How should the workflow notify you?",
  );
});

test("conversation changes add, remove, and replace integrations", () => {
  const conversation = sanitizeAutomationConversation([
    {
      role: "user",
      content:
        "When a lead arrives, save it in Google Sheets and notify me on Telegram.",
    },
    { role: "user", content: "Also send an email to the manager." },
    { role: "user", content: "Remove Telegram." },
    { role: "user", content: "Save the information in Airtable instead." },
  ]);
  const requirements = inferAutomationRequirements(conversation);
  assert.ok(requirements.applications.includes("Gmail"));
  assert.ok(requirements.applications.includes("Airtable"));
  assert.ok(!requirements.applications.includes("Telegram"));
  assert.ok(!requirements.applications.includes("Google Sheets"));
});

test("an already asked question is not repeated", () => {
  const conversation = sanitizeAutomationConversation([
    { role: "user", content: "Automate invoice processing for my customer." },
    { role: "assistant", content: "What should start this automation?" },
    { role: "user", content: "Use the normal process." },
  ]);
  const requirements = inferAutomationRequirements(conversation);
  assert.notEqual(
    getEssentialAutomationQuestion(requirements, conversation),
    "What should start this automation?",
  );
});

test("the main page keeps advanced fields hidden and starts without validation", () => {
  const page = readFileSync(
    join(root, "app/(app)/tools/automation-builder/page.tsx"),
    "utf8",
  );
  assert.doesNotMatch(page, /RequirementsPanel/);
  assert.doesNotMatch(page, /Requirements summary/i);
  assert.doesNotMatch(page, /validateAutomationRequirements/);
  assert.match(page, /Describe the automation you want to create/);
  assert.match(page, /WhatsApp customer service/);
  assert.match(page, /Lead collection and follow-up/);
  assert.match(page, /Appointment booking/);
  assert.match(page, /<details className="group rounded-xl border bg-card">/);
  assert.match(page, /sm:/);
});
