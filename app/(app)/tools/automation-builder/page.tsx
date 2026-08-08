"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  FileJson,
  FileText,
  History,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { WorkflowPreview } from "@/components/automation-builder/workflow-preview";
import { useAutomationBuilderAccess } from "@/components/automation-builder/access-gate";
import { projectToArtifact } from "@/lib/automation-builder/projects";
import { EMPTY_AUTOMATION_REQUIREMENTS } from "@/lib/automation-builder/security";
import type {
  AutomationArtifact,
  AutomationConversationMessage,
  AutomationRequirements,
  AutomationWorkflowPlan,
  AutomationWorkflowProject,
} from "@/types/automation-workflow";

interface ChatMessage extends AutomationConversationMessage {
  id: number;
}

const INITIAL_MESSAGE =
  "Tell LeadPilot what your customer needs. You can explain it exactly as the customer explained it to you.";

const EXAMPLE_PROMPTS = [
  {
    label: "WhatsApp customer service",
    prompt:
      "Create an n8n workflow that receives WhatsApp customer messages, answers common questions automatically using AI, saves customer details to Google Sheets, and alerts me on Telegram when a customer wants to place an order.",
  },
  {
    label: "Lead collection and follow-up",
    prompt:
      "Build an automation that receives new leads from a website form, saves them in Google Sheets, sends a welcome email through Gmail, and follows up again after two days if they have not replied.",
  },
  {
    label: "Appointment booking",
    prompt:
      "Create an appointment-booking workflow that receives booking requests, adds confirmed appointments to Google Calendar, emails the customer a confirmation, and alerts me if a requested time is unavailable.",
  },
] as const;

const PROGRESS_STEPS = [
  "Understanding your request",
  "Designing the workflow",
  "Validating the workflow",
  "Preparing your files",
] as const;

const pauseForPaint = () =>
  new Promise<void>((resolve) => window.setTimeout(resolve, 120));

function emptyRequirements(): AutomationRequirements {
  return { ...EMPTY_AUTOMATION_REQUIREMENTS, applications: [] };
}

function usageLabel(unlimited: boolean, used: number, limit: number): string {
  return unlimited
    ? "Owner access · Unlimited"
    : `${used} of ${limit} builder generations used`;
}

function initialMessages(): ChatMessage[] {
  return [{ id: 1, role: "assistant", content: INITIAL_MESSAGE }];
}

export default function AutomationBuilderPage() {
  const { entitlement, readOnly, showLimit } = useAutomationBuilderAccess();
  const [requirements, setRequirements] = React.useState(emptyRequirements);
  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages);
  const [chatInput, setChatInput] = React.useState("");
  const [plan, setPlan] = React.useState<AutomationWorkflowPlan | null>(null);
  const [artifact, setArtifact] = React.useState<AutomationArtifact | null>(null);
  const [projectId, setProjectId] = React.useState<string | null>(null);
  const [planSource, setPlanSource] = React.useState<
    "openai" | "structured-template"
  >("structured-template");
  const [busy, setBusy] = React.useState<"load" | "generate" | "regenerate" | null>(null);
  const [progressStep, setProgressStep] = React.useState<number | null>(null);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [highRiskReview, setHighRiskReview] = React.useState("");
  const [runtimeUsage, setRuntimeUsage] = React.useState({
    used: entitlement.generationsUsed,
    limit: entitlement.generationsLimit,
    unlimited: entitlement.isOwner,
  });
  const messageId = React.useRef(1);
  const composerRef = React.useRef<HTMLTextAreaElement>(null);
  const conversationEndRef = React.useRef<HTMLDivElement>(null);

  const makeMessage = React.useCallback(function makeMessage(
    role: AutomationConversationMessage["role"],
    content: string,
  ): ChatMessage {
    messageId.current += 1;
    return { id: messageId.current, role, content };
  }, []);

  React.useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, progressStep]);

  React.useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("project");
    if (!id) return;
    setBusy("load");
    fetch(`/api/automation-builder/projects/${encodeURIComponent(id)}`, {
      cache: "no-store",
    })
      .then(async (response) => ({ ok: response.ok, data: await response.json() }))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || "Could not load the automation.");
        const project = data.project as AutomationWorkflowProject;
        setProjectId(project.id);
        setRequirements(project.requirements);
        setPlan(project.workflow_plan);
        if (project.validation_status === "valid")
          setArtifact(projectToArtifact(project));
        const loaded = makeMessage(
          "assistant",
          `${project.project_name} is loaded. Describe any change you want, or download the existing files below.`,
        );
        setMessages([loaded]);
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Could not load the automation."),
      )
      .finally(() => setBusy(null));
  }, [makeMessage]);

  async function generateFromPlan(
    nextRequirements: AutomationRequirements,
    nextPlan: AutomationWorkflowPlan,
    source: "openai" | "structured-template",
    conversation: ChatMessage[],
  ) {
    setProgressStep(2);
    await pauseForPaint();
    const response = await fetch("/api/automation-builder/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requirements: nextRequirements,
        plan: nextPlan,
        projectId,
        source,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      if (data.code === "MONTHLY_LIMIT_REACHED") showLimit(data.entitlement);
      throw new Error(data.error || "Could not generate the workflow.");
    }
    setProgressStep(3);
    await pauseForPaint();
    setRequirements(nextRequirements);
    setPlan(nextPlan);
    setPlanSource(source);
    setArtifact(data.artifact);
    setProjectId(data.project.id);
    setRuntimeUsage((current) => ({
      used: data.usage.used ?? current.used,
      limit: data.usage.limit ?? current.limit,
      unlimited: Boolean(data.usage.unlimited),
    }));
    setMessages([
      ...conversation,
      makeMessage(
        "assistant",
        `${data.artifact.plan.workflowName} is ready. I validated the workflow and prepared the n8n JSON and setup guide.`,
      ),
    ]);
    setNotice("Workflow validated and saved to your automation history.");
  }

  async function processConversation(nextMessages: ChatMessage[]) {
    setBusy("generate");
    setProgressStep(0);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/automation-builder/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation: nextMessages.map(({ role, content }) => ({ role, content })),
          requirements,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not understand the request.");
      setRequirements(data.requirements);
      if (!data.ready) {
        setMessages([
          ...nextMessages,
          makeMessage("assistant", data.question),
        ]);
        return;
      }
      setProgressStep(1);
      setPlan(data.plan);
      setPlanSource(data.source);
      setHighRiskReview(data.highRiskReview || "");
      await pauseForPaint();
      await generateFromPlan(
        data.requirements,
        data.plan,
        data.source,
        nextMessages,
      );
    } catch (reason) {
      const text = reason instanceof Error ? reason.message : "Automation generation failed.";
      setError(text);
      setMessages((current) => [
        ...current,
        makeMessage("assistant", `I could not complete that request: ${text}`),
      ]);
    } finally {
      setBusy(null);
      setProgressStep(null);
    }
  }

  function submitPrompt(event: React.FormEvent) {
    event.preventDefault();
    const content = chatInput.trim();
    if (!content || readOnly || busy) return;
    const nextMessages = [...messages, makeMessage("user", content)];
    setMessages(nextMessages);
    setChatInput("");
    void processConversation(nextMessages);
  }

  async function regenerate() {
    if (!plan || readOnly || busy) return;
    setBusy("regenerate");
    setError("");
    setNotice("");
    try {
      await generateFromPlan(requirements, plan, planSource, messages);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not regenerate the workflow.",
      );
    } finally {
      setBusy(null);
      setProgressStep(null);
    }
  }

  function download(format: "json" | "pdf") {
    if (!projectId || !artifact?.validation.valid) return;
    window.location.assign(
      `/api/automation-builder/projects/${encodeURIComponent(projectId)}/download?format=${format}`,
    );
  }

  function editPrompt() {
    const latest = [...messages].reverse().find((message) => message.role === "user");
    setChatInput(latest?.content || requirements.customerProblem);
    setRequirements(emptyRequirements());
    setPlan(null);
    setArtifact(null);
    setMessages(initialMessages());
    setNotice("Edit the prompt, then generate it again.");
    requestAnimationFrame(() => composerRef.current?.focus());
  }

  function startNew() {
    setRequirements(emptyRequirements());
    setMessages(initialMessages());
    setChatInput("");
    setPlan(null);
    setArtifact(null);
    setProjectId(null);
    setError("");
    setNotice("");
    setHighRiskReview("");
    window.history.replaceState({}, "", "/tools/automation-builder");
    requestAnimationFrame(() => composerRef.current?.focus());
  }

  const hasUserMessage = messages.some((message) => message.role === "user");
  const working = Boolean(busy && busy !== "load");
  const setupRequirements = artifact?.requiredCredentials.length
    ? artifact.requiredCredentials
    : ["Replace the safe placeholder values and review field mappings in n8n."];

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold sm:text-3xl">AI Automation Builder</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Describe the automation you want to create. LeadPilot will turn it
            into a validated n8n workflow and a simple setup guide.
          </p>
          <Badge variant="secondary" className="mt-3">
            {usageLabel(
              runtimeUsage.unlimited,
              runtimeUsage.used,
              runtimeUsage.limit,
            )}
          </Badge>
        </div>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/tools/automation-builder/history">
            <History className="mr-2 h-4 w-4" /> Saved Automations
          </Link>
        </Button>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
        >
          {notice}
        </div>
      )}

      {busy === "load" ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-2xl border bg-card">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading automation...
        </div>
      ) : (
        <Card className="overflow-hidden border-primary/15 shadow-lg">
          <CardContent className="p-0">
            <div
              className="min-h-[420px] space-y-5 overflow-y-auto px-4 py-6 sm:min-h-[500px] sm:px-8"
              aria-live="polite"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[78%] ${
                      message.role === "user"
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md bg-muted"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {!hasUserMessage && !working && !projectId && (
                <div className="mx-auto max-w-3xl pt-4 text-center">
                  <h2 className="text-xl font-semibold sm:text-2xl">
                    Describe the automation you want to create
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Start with an example or explain the customer&apos;s request in your own words.
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {EXAMPLE_PROMPTS.map((example) => (
                      <button
                        key={example.label}
                        type="button"
                        className="rounded-xl border bg-card p-4 text-left text-sm transition hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => {
                          setChatInput(example.prompt);
                          composerRef.current?.focus();
                        }}
                      >
                        <Sparkles className="mb-3 h-4 w-4 text-primary" />
                        <span className="font-medium">{example.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {working && progressStep !== null && (
                <div className="flex justify-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                  <div className="w-full max-w-md rounded-2xl rounded-bl-md bg-muted p-4">
                    <p className="text-sm font-medium">Creating your automation</p>
                    <div className="mt-3 space-y-2">
                      {PROGRESS_STEPS.map((step, index) => (
                        <div
                          key={step}
                          className={`flex items-center gap-2 text-xs ${
                            index <= progressStep
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {index < progressStep ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : index === progressStep ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <span className="h-4 w-4 rounded-full border" />
                          )}
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={conversationEndRef} />
            </div>

            <form
              onSubmit={submitPrompt}
              className="sticky bottom-0 border-t bg-card/95 p-3 backdrop-blur sm:p-5"
            >
              <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
                <Textarea
                  ref={composerRef}
                  value={chatInput}
                  disabled={readOnly || working}
                  rows={3}
                  maxLength={3000}
                  aria-label="Describe your automation"
                  className="min-h-[84px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                  placeholder="Example: Create an n8n workflow that receives WhatsApp customer messages, answers common questions using AI, saves customer details to Google Sheets and alerts me on Telegram when a customer wants to place an order."
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="mb-1 h-10 w-10 shrink-0 rounded-xl"
                  disabled={!chatInput.trim() || readOnly || working}
                  aria-label="Generate automation"
                >
                  {working ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Do not paste API keys, passwords, access tokens, or private customer data.
              </p>
            </form>
          </CardContent>
        </Card>
      )}

      {highRiskReview && (
        <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          {highRiskReview}
        </div>
      )}

      {plan && (
        <details className="group rounded-xl border bg-card">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-medium sm:px-6">
            View workflow details
            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
          </summary>
          <div className="grid gap-4 border-t p-4 text-sm sm:grid-cols-2 sm:p-6">
            <div>
              <p className="text-xs text-muted-foreground">Trigger</p>
              <p className="mt-1 font-medium">{requirements.trigger}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Integrations</p>
              <p className="mt-1 font-medium">
                {requirements.applications.join(", ") || "No external app required"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Actions</p>
              <p className="mt-1 text-muted-foreground">{requirements.actionsRequired}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Conditions</p>
              <p className="mt-1 text-muted-foreground">
                {requirements.conditions || "No special condition was required."}
              </p>
            </div>
          </div>
        </details>
      )}

      {artifact && (
        <Card id="workflow-output" className="border-emerald-500/25 shadow-lg">
          <CardHeader className="border-b bg-emerald-500/5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  <CardTitle>{artifact.plan.workflowName}</CardTitle>
                </div>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  {artifact.summary}
                </p>
              </div>
              <Badge variant="default">Validated</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-4 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border p-4">
                <p className="text-xs text-muted-foreground">Apps used</p>
                <p className="mt-1 font-semibold">
                  {requirements.applications.join(", ") || "Built-in n8n tools"}
                </p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-xs text-muted-foreground">Workflow size</p>
                <p className="mt-1 font-semibold">{artifact.workflow.nodes.length} nodes</p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-xs text-muted-foreground">Validation</p>
                <p className="mt-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  Safe to download
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4">
              <h3 className="font-semibold">Important setup requirements</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {setupRequirements.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button size="lg" onClick={() => download("json")}>
                <FileJson className="mr-2 h-5 w-5" /> Download n8n JSON
              </Button>
              <Button size="lg" variant="outline" onClick={() => download("pdf")}>
                <FileText className="mr-2 h-5 w-5" /> Download PDF guide
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-5">
              <Button variant="outline" onClick={editPrompt} disabled={working}>
                <Pencil className="mr-2 h-4 w-4" /> Edit prompt
              </Button>
              <Button variant="outline" onClick={() => void regenerate()} disabled={working}>
                <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
              </Button>
              <Button
                variant="outline"
                onClick={() => setNotice("Automation saved to your history.")}
              >
                <Save className="mr-2 h-4 w-4" /> Save automation
              </Button>
              <Button variant="ghost" onClick={startNew} disabled={working}>
                <Plus className="mr-2 h-4 w-4" /> Start new automation
              </Button>
            </div>

            <details className="group rounded-xl border">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-medium">
                Advanced Preview
                <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
              </summary>
              <div className="border-t p-4">
                <WorkflowPreview artifact={artifact} />
              </div>
            </details>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
              Review and test this workflow in a safe n8n environment before
              using it with real customer data.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
