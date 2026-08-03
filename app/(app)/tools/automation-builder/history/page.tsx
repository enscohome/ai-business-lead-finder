"use client";

import * as React from "react";
import Link from "next/link";
import {
  Copy,
  Edit3,
  FileJson,
  FileText,
  FolderKanban,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAutomationBuilderAccess } from "@/components/automation-builder/access-gate";
import type { AutomationWorkflowProject } from "@/types/automation-workflow";

export default function AutomationHistoryPage() {
  const { readOnly, showLimit } = useAutomationBuilderAccess();
  const [projects, setProjects] = React.useState<AutomationWorkflowProject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [regeneratingId, setRegeneratingId] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    setError("");
    fetch("/api/automation-builder/projects", { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, data: await response.json() }))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || "Could not load automations.");
        setProjects(data.projects || []);
      })
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(load, [load]);

  function download(project: AutomationWorkflowProject, format: "json" | "pdf") {
    window.location.assign(
      `/api/automation-builder/projects/${encodeURIComponent(project.id)}/download?format=${format}`,
    );
  }

  async function duplicate(project: AutomationWorkflowProject) {
    if (readOnly) return;
    setError("");
    const response = await fetch("/api/automation-builder/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate", projectId: project.id }),
    });
    const data = await response.json();
    if (!response.ok)
      return setError(data.error || "Could not duplicate the project.");
    setProjects((current) => [data.project, ...current]);
    setMessage("Automation project duplicated.");
  }

  async function remove(project: AutomationWorkflowProject) {
    if (readOnly) return;
    if (
      !window.confirm(
        `Delete “${project.project_name}”? This cannot be undone.`,
      )
    )
      return;
    const response = await fetch(
      `/api/automation-builder/projects/${encodeURIComponent(project.id)}`,
      { method: "DELETE" },
    );
    const data = await response.json();
    if (!response.ok)
      return setError(data.error || "Could not delete the project.");
    setProjects((current) => current.filter((item) => item.id !== project.id));
    setMessage("Automation project deleted.");
  }

  async function regenerate(project: AutomationWorkflowProject) {
    if (readOnly || regeneratingId) return;
    setRegeneratingId(project.id);
    setError("");
    const response = await fetch("/api/automation-builder/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requirements: project.requirements,
        plan: project.workflow_plan,
        projectId: project.id,
        source: "structured-template",
      }),
    });
    const data = await response.json();
    setRegeneratingId(null);
    if (!response.ok) {
      if (data.code === "MONTHLY_LIMIT_REACHED") showLimit(data.entitlement);
      return setError(data.error || "Could not regenerate the automation.");
    }
    setProjects((current) =>
      current.map((item) =>
        item.id === project.id
          ? {
              ...item,
              requirements: data.artifact.requirements,
              workflow_plan: data.artifact.plan,
              generated_workflow: data.artifact.workflow,
              workflow_summary: data.artifact.summary,
              required_credentials: data.artifact.requiredCredentials,
              validation_status: "valid",
              validation_errors: [],
              generation_count: data.project.generationCount,
              status: "generated",
              updated_at: new Date().toISOString(),
            }
          : item,
      ),
    );
    setMessage("Automation regenerated and validated.");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Saved automations</h1>
          <p className="mt-2 text-muted-foreground">
            {readOnly
              ? "Your plan has ended. Valid saved JSON and PDF files remain available for download."
              : "Open, edit, regenerate, download, duplicate, or delete your n8n automation projects."}
          </p>
        </div>
        {readOnly ? (
          <Button asChild>
            <Link href="/pricing">Renew plan</Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href="/tools/automation-builder">
              <Plus className="mr-2 h-4 w-4" /> New automation
            </Link>
          </Button>
        )}
      </div>
      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          {message}
        </div>
      )}
      {loading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading saved automations...
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
            <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="text-xl font-semibold">No automation projects yet</h2>
            <p className="mt-2 max-w-md text-muted-foreground">
              Describe a customer&apos;s manual process and create your first
              controlled n8n workflow package.
            </p>
            {!readOnly && (
              <Button asChild className="mt-5">
                <Link href="/tools/automation-builder">Create an automation</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => {
            const integrations = project.requirements?.applications || [];
            const downloadable = project.validation_status === "valid";
            return (
              <Card key={project.id}>
                <CardContent className="p-5">
                  <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-semibold">
                          {project.project_name}
                        </h2>
                        <Badge variant="secondary">{project.status}</Badge>
                        <Badge
                          variant={downloadable ? "default" : "destructive"}
                        >
                          {project.validation_status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {project.client_name || "Client not specified"} · {project.business_type || "Business type not specified"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline">
                          Category: {project.automation_category}
                        </Badge>
                        <Badge variant="outline">
                          Trigger: {project.workflow_plan?.trigger || "Not planned"}
                        </Badge>
                        <Badge variant="outline">
                          Nodes: {project.generated_workflow?.nodes?.length || project.workflow_plan?.nodes?.length || 0}
                        </Badge>
                        <Badge variant="outline">
                          Generations: {project.generation_count}
                        </Badge>
                        {integrations.slice(0, 4).map((item) => (
                          <Badge key={item} variant="outline">
                            {item}
                          </Badge>
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Created {new Date(project.created_at).toLocaleDateString()} · Updated {new Date(project.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!readOnly && (
                        <>
                          <Button asChild size="sm">
                            <Link href={`/tools/automation-builder?project=${project.id}`}>
                              <Edit3 className="mr-2 h-4 w-4" /> Open
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={Boolean(regeneratingId)}
                            onClick={() => regenerate(project)}
                          >
                            {regeneratingId === project.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            Regenerate
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!downloadable}
                        onClick={() => download(project, "json")}
                      >
                        <FileJson className="mr-2 h-4 w-4" /> JSON
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!downloadable}
                        onClick={() => download(project, "pdf")}
                      >
                        <FileText className="mr-2 h-4 w-4" /> PDF
                      </Button>
                      {!readOnly && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => duplicate(project)}
                          >
                            <Copy className="mr-2 h-4 w-4" /> Duplicate
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => remove(project)}
                          >
                            <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
