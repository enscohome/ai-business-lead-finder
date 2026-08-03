"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Bot,
  Copy,
  Download,
  FileJson,
  FileText,
  History,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RequirementsPanel } from "@/components/automation-builder/requirements-panel";
import { WorkflowPreview } from "@/components/automation-builder/workflow-preview";
import { useAutomationBuilderAccess } from "@/components/automation-builder/access-gate";
import {
  SUPPORTED_NODE_CATALOGUE,
  SUPPORTED_NODE_KEYS,
} from "@/lib/automation-builder/catalogue";
import {
  getFollowUpQuestions,
  rebuildPlanConnections,
} from "@/lib/automation-builder/planner";
import { projectToArtifact } from "@/lib/automation-builder/projects";
import { EMPTY_AUTOMATION_REQUIREMENTS } from "@/lib/automation-builder/security";
import type {
  AutomationArtifact,
  AutomationRequirements,
  AutomationWorkflowPlan,
  AutomationWorkflowProject,
  SupportedNodeKey,
} from "@/types/automation-workflow";

interface ChatMessage {
  id: number;
  role: "assistant" | "user";
  text: string;
}

function cloneEmptyRequirements(): AutomationRequirements {
  return { ...EMPTY_AUTOMATION_REQUIREMENTS, applications: [] };
}

function usageLabel(
  isOwner: boolean,
  used: number,
  limit: number,
): string {
  return isOwner ? "Owner access · Unlimited" : `${used} of ${limit} builder generations used`;
}

export default function AutomationBuilderPage() {
  const { entitlement, readOnly, showLimit } = useAutomationBuilderAccess();
  const [requirements, setRequirements] = React.useState(
    cloneEmptyRequirements,
  );
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "Describe the business problem you want to automate.",
    },
  ]);
  const [chatInput, setChatInput] = React.useState("");
  const [plan, setPlan] = React.useState<AutomationWorkflowPlan | null>(null);
  const [artifact, setArtifact] = React.useState<AutomationArtifact | null>(null);
  const [projectId, setProjectId] = React.useState<string | null>(null);
  const [planSource, setPlanSource] = React.useState<
    "openai" | "structured-template"
  >("structured-template");
  const [addNodeKey, setAddNodeKey] = React.useState<SupportedNodeKey>("httpRequest");
  const [busy, setBusy] = React.useState<"load" | "plan" | "save" | "generate" | null>(null);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [highRiskReview, setHighRiskReview] = React.useState("");
  const [runtimeUsage, setRuntimeUsage] = React.useState({
    used: entitlement.generationsUsed,
    limit: entitlement.generationsLimit,
    unlimited: entitlement.isOwner,
  });
  const messageId = React.useRef(2);

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
        setMessages([
          {
            id: 1,
            role: "assistant",
            text: `Loaded ${project.project_name}. Review the requirements and workflow plan before regenerating or downloading.`,
          },
        ]);
      })
      .catch((reason) => setError(reason.message))
      .finally(() => setBusy(null));
  }, []);

  const nextQuestion = getFollowUpQuestions(requirements)[0] || null;

  function appendMessage(role: ChatMessage["role"], text: string) {
    messageId.current += 1;
    setMessages((current) => [
      ...current,
      { id: messageId.current, role, text },
    ]);
  }

  function submitChat(event: React.FormEvent) {
    event.preventDefault();
    const answer = chatInput.trim();
    if (!answer || !nextQuestion || readOnly) return;
    const updated: AutomationRequirements = {
      ...requirements,
      [nextQuestion.field]:
        nextQuestion.field === "applications"
          ? answer
              .split(/[,\n]/)
              .map((item) => item.trim())
              .filter(Boolean)
          : answer,
    };
    setRequirements(updated);
    appendMessage("user", answer);
    const following = getFollowUpQuestions(updated)[0];
    appendMessage(
      "assistant",
      following
        ? following.question
        : "I have enough information to create a controlled n8n workflow plan. Review the requirements panel, then choose Create workflow plan.",
    );
    setChatInput("");
  }

  function skipOptionalQuestion() {
    if (!nextQuestion?.optional) return;
    const updated = {
      ...requirements,
      [nextQuestion.field]: "Not required",
    } as AutomationRequirements;
    setRequirements(updated);
    appendMessage("user", "Not required for this project.");
    const following = getFollowUpQuestions(updated)[0];
    appendMessage(
      "assistant",
      following
        ? following.question
        : "The requirements are ready for review.",
    );
  }

  async function createPlan() {
    setBusy("plan");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/automation-builder/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirements }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.code === "MONTHLY_LIMIT_REACHED") showLimit(data.entitlement);
        throw new Error(data.error || "Could not create the workflow plan.");
      }
      setPlan(data.plan);
      setPlanSource(data.source);
      setHighRiskReview(data.highRiskReview || "");
      setArtifact(null);
      setMessage(
        "Workflow plan created. Edit the plan and connection order before generating JSON.",
      );
      requestAnimationFrame(() =>
        document.getElementById("workflow-plan")?.scrollIntoView({
          behavior: "smooth",
        }),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Plan generation failed.");
    } finally {
      setBusy(null);
    }
  }

  function updatePlanNodes(nextNodes: AutomationWorkflowPlan["nodes"]) {
    if (!plan) return;
    setPlan(rebuildPlanConnections({ ...plan, nodes: nextNodes }));
    setArtifact(null);
  }

  function moveNode(index: number, direction: -1 | 1) {
    if (!plan) return;
    const destination = index + direction;
    if (
      index === 0 ||
      destination <= 0 ||
      destination >= plan.nodes.length
    )
      return;
    const next = [...plan.nodes];
    [next[index], next[destination]] = [next[destination], next[index]];
    updatePlanNodes(next);
  }

  function addNode() {
    if (!plan) return;
    const definition = SUPPORTED_NODE_CATALOGUE[addNodeKey];
    if (definition.isTrigger) return;
    let name = definition.label;
    let suffix = 2;
    while (plan.nodes.some((node) => node.name.toLowerCase() === name.toLowerCase())) {
      name = `${definition.label} ${suffix}`;
      suffix += 1;
    }
    updatePlanNodes([
      ...plan.nodes,
      {
        key: addNodeKey,
        name,
        purpose: definition.description,
        credential: definition.credential,
      },
    ]);
  }

  async function saveProject() {
    if (!plan || readOnly) return;
    setBusy("save");
    setError("");
    try {
      const response = await fetch(
        projectId
          ? `/api/automation-builder/projects/${encodeURIComponent(projectId)}`
          : "/api/automation-builder/projects",
        {
          method: projectId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requirements, plan }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save the project.");
      setProjectId(data.project.id);
      setPlan(data.project.workflow_plan);
      setArtifact(null);
      setMessage("Automation project saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Save failed.");
    } finally {
      setBusy(null);
    }
  }

  async function generateWorkflow() {
    if (!plan || readOnly) return;
    setBusy("generate");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/automation-builder/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirements,
          plan,
          projectId,
          source: planSource,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.code === "MONTHLY_LIMIT_REACHED") showLimit(data.entitlement);
        throw new Error(data.error || "Could not generate the workflow.");
      }
      setArtifact(data.artifact);
      setProjectId(data.project.id);
      setRuntimeUsage({
        used: data.usage.used ?? runtimeUsage.used,
        limit: data.usage.limit ?? runtimeUsage.limit,
        unlimited: Boolean(data.usage.unlimited),
      });
      setMessage("Workflow validated and saved. JSON and PDF downloads are ready.");
      requestAnimationFrame(() =>
        document.getElementById("workflow-output")?.scrollIntoView({
          behavior: "smooth",
        }),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Workflow generation failed.",
      );
    } finally {
      setBusy(null);
    }
  }

  function download(format: "json" | "pdf") {
    if (!projectId || !artifact?.validation.valid) return;
    window.location.assign(
      `/api/automation-builder/projects/${encodeURIComponent(projectId)}/download?format=${format}`,
    );
  }

  async function copySummary() {
    if (!artifact) return;
    await navigator.clipboard.writeText(artifact.summary);
    setMessage("Workflow summary copied.");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold">AI Automation Builder</h1>
          </div>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Turn a customer&apos;s business problem into a reviewed, importable
            n8n workflow and a professional setup guide. Version one supports
            n8n only and never connects to or activates an n8n instance.
          </p>
          <Badge variant="secondary" className="mt-3">
            {usageLabel(
              runtimeUsage.unlimited,
              runtimeUsage.used,
              runtimeUsage.limit,
            )}
          </Badge>
        </div>
        <Button asChild variant="outline">
          <Link href="/tools/automation-builder/history">
            <History className="mr-2 h-4 w-4" />
            Saved automations
          </Link>
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      {message && (
        <div
          role="status"
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
        >
          {message}
        </div>
      )}
      {busy === "load" ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading project...
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
            <Card className="flex min-h-[680px] flex-col overflow-hidden">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Requirements assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col p-0">
                <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                  {messages.map((item) => (
                    <div
                      key={item.id}
                      className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          item.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {item.text}
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={submitChat} className="border-t p-4">
                  <Label htmlFor="automation-chat">
                    {nextQuestion?.question || "Requirements ready for review"}
                  </Label>
                  <div className="mt-2 flex gap-2">
                    <Textarea
                      id="automation-chat"
                      value={chatInput}
                      disabled={!nextQuestion || readOnly || Boolean(busy)}
                      className="min-h-20 flex-1"
                      placeholder="Do not paste API keys, passwords, tokens, or customer secrets."
                      onChange={(event) => setChatInput(event.target.value)}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="h-11 w-11 shrink-0"
                      disabled={!chatInput.trim() || !nextQuestion || readOnly}
                      aria-label="Send answer"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  {nextQuestion?.optional && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={skipOptionalQuestion}
                    >
                      Skip optional question
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>

            <Card id="requirements-panel" className="h-fit lg:max-h-[820px] lg:overflow-y-auto">
              <CardHeader className="sticky top-0 z-10 border-b bg-card">
                <CardTitle className="text-lg">Requirements summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 p-4 sm:p-6">
                <RequirementsPanel
                  value={requirements}
                  onChange={(next) => {
                    setRequirements(next);
                    setPlan(null);
                    setArtifact(null);
                  }}
                  disabled={readOnly || Boolean(busy)}
                />
                <Button
                  className="w-full"
                  disabled={readOnly || Boolean(busy)}
                  onClick={createPlan}
                >
                  {busy === "plan" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Create workflow plan
                </Button>
              </CardContent>
            </Card>
          </div>

          {plan && (
            <Card id="workflow-plan">
              <CardHeader>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <CardTitle>Review and edit workflow plan</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Confirm every node and connection before JSON generation.
                    </p>
                  </div>
                  <Badge variant="outline">
                    {planSource === "openai" ? "AI-enhanced plan" : "Controlled plan"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {highRiskReview && (
                  <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
                    <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                    {highRiskReview}
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Workflow name</Label>
                    <Input
                      value={plan.workflowName}
                      maxLength={120}
                      onChange={(event) =>
                        setPlan({ ...plan, workflowName: event.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Trigger</Label>
                    <Input
                      value={plan.trigger}
                      maxLength={800}
                      onChange={(event) => setPlan({ ...plan, trigger: event.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {(
                    [
                      ["dataFlow", "Data flow"],
                      ["conditions", "Conditions"],
                      ["errorPath", "Error path"],
                      ["finalOutput", "Final output"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-2">
                      <Label>{label}</Label>
                      <Textarea
                        value={plan[key]}
                        maxLength={2000}
                        onChange={(event) =>
                          setPlan({ ...plan, [key]: event.target.value })
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <Label>Nodes and connection order</Label>
                      <p className="text-xs text-muted-foreground">
                        Only supported first-version nodes can be added.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <select
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                        value={addNodeKey}
                        onChange={(event) =>
                          setAddNodeKey(event.target.value as SupportedNodeKey)
                        }
                      >
                        {SUPPORTED_NODE_KEYS.filter(
                          (key) => !SUPPORTED_NODE_CATALOGUE[key].isTrigger,
                        ).map((key) => (
                          <option key={key} value={key}>
                            {SUPPORTED_NODE_CATALOGUE[key].label}
                          </option>
                        ))}
                      </select>
                      <Button type="button" variant="outline" onClick={addNode}>
                        <Plus className="mr-2 h-4 w-4" /> Add
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    {plan.nodes.map((node, index) => (
                      <div key={`${node.name}-${index}`} className="rounded-lg border p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">{index + 1}</Badge>
                              <strong>{node.name}</strong>
                              <Badge variant="outline">
                                {SUPPORTED_NODE_CATALOGUE[node.key].label}
                              </Badge>
                            </div>
                            <Textarea
                              aria-label={`${node.name} purpose`}
                              value={node.purpose}
                              className="mt-3 min-h-20"
                              maxLength={600}
                              onChange={(event) =>
                                updatePlanNodes(
                                  plan.nodes.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, purpose: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                            />
                            {node.credential && (
                              <p className="mt-2 text-xs text-muted-foreground">
                                Credential to connect in n8n: {node.credential}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => moveNode(index, -1)}
                              disabled={index <= 1}
                              aria-label={`Move ${node.name} up`}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => moveNode(index, 1)}
                              disabled={
                                index === 0 || index === plan.nodes.length - 1
                              }
                              aria-label={`Move ${node.name} down`}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={index === 0 || plan.nodes.length <= 2}
                              onClick={() =>
                                updatePlanNodes(
                                  plan.nodes.filter((_, itemIndex) => itemIndex !== index),
                                )
                              }
                              aria-label={`Remove ${node.name}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={saveProject} disabled={Boolean(busy)}>
                    {busy === "save" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save project
                  </Button>
                  <Button onClick={generateWorkflow} disabled={Boolean(busy)}>
                    {busy === "generate" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileJson className="mr-2 h-4 w-4" />
                    )}
                    Generate validated n8n JSON
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {artifact && (
            <Card id="workflow-output">
              <CardHeader>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <CardTitle>Validated workflow package</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {artifact.summary}
                    </p>
                  </div>
                  <Badge variant={artifact.validation.valid ? "default" : "destructive"}>
                    {artifact.validation.valid ? "Download ready" : "Download blocked"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <WorkflowPreview artifact={artifact} />
                <div className="flex flex-wrap gap-2 border-t pt-5">
                  <Button onClick={() => download("json")}>
                    <Download className="mr-2 h-4 w-4" /> Download JSON
                  </Button>
                  <Button variant="outline" onClick={() => download("pdf")}>
                    <FileText className="mr-2 h-4 w-4" /> Download PDF
                  </Button>
                  <Button variant="outline" onClick={copySummary}>
                    <Copy className="mr-2 h-4 w-4" /> Copy summary
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      document.getElementById("requirements-panel")?.scrollIntoView({
                        behavior: "smooth",
                      })
                    }
                  >
                    Edit requirements
                  </Button>
                  <Button variant="outline" onClick={generateWorkflow} disabled={Boolean(busy)}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
                  </Button>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-medium text-amber-900 dark:text-amber-100">
                  Review and test this workflow in a safe n8n environment before
                  using it with real customer data.
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
