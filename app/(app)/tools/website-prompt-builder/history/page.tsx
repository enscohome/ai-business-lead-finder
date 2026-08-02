"use client";

import * as React from "react";
import Link from "next/link";
import {
  Copy,
  Download,
  Edit3,
  FilePlus2,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { WebsitePromptProject } from "@/types/website-prompt";

function download(project: WebsitePromptProject) {
  const text =
    project.prompt_outputs?.[project.target_ai] ||
    project.generated_prompt ||
    project.general_brief;
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${project.project_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function WebsitePromptHistoryPage() {
  const [projects, setProjects] = React.useState<WebsitePromptProject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  const load = React.useCallback(() => {
    setLoading(true);
    setError("");
    fetch("/api/website-prompt-builder/projects", { cache: "no-store" })
      .then(async (response) => ({
        ok: response.ok,
        data: await response.json(),
      }))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || "Could not load projects.");
        setProjects(data.projects);
      })
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);
  React.useEffect(load, [load]);

  const remove = async (project: WebsitePromptProject) => {
    if (
      !window.confirm(
        `Delete “${project.project_name}”? This cannot be undone.`,
      )
    )
      return;
    const response = await fetch(
      `/api/website-prompt-builder/projects/${project.id}`,
      { method: "DELETE" },
    );
    const data = await response.json();
    if (!response.ok)
      return setError(data.error || "Could not delete project.");
    setProjects((items) => items.filter((item) => item.id !== project.id));
    setMessage("Project deleted.");
  };
  const duplicate = async (project: WebsitePromptProject) => {
    const formData = {
      ...project.form_data,
      projectName: `${project.project_name} copy`,
    };
    const response = await fetch("/api/website-prompt-builder/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formData,
        outputs: project.prompt_outputs,
        targetAi: project.target_ai,
      }),
    });
    const data = await response.json();
    if (!response.ok)
      return setError(data.error || "Could not duplicate project.");
    setProjects((items) => [data.project, ...items]);
    setMessage("Project duplicated.");
  };
  const rename = async (project: WebsitePromptProject) => {
    const name = window
      .prompt("New project name", project.project_name)
      ?.trim();
    if (!name || name === project.project_name) return;
    const response = await fetch(
      `/api/website-prompt-builder/projects/${project.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData: { ...project.form_data, projectName: name },
          outputs: project.prompt_outputs,
          targetAi: project.target_ai,
          status: project.status,
        }),
      },
    );
    const data = await response.json();
    if (!response.ok)
      return setError(data.error || "Could not rename project.");
    setProjects((items) =>
      items.map((item) => (item.id === project.id ? data.project : item)),
    );
    setMessage("Project renamed.");
  };
  const copy = async (project: WebsitePromptProject) => {
    await navigator.clipboard.writeText(
      project.prompt_outputs?.[project.target_ai] ||
        project.generated_prompt ||
        project.general_brief,
    );
    setMessage("Prompt copied.");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">My Website Prompts</h1>
          <p className="mt-2 text-muted-foreground">
            Open, edit, copy, download, duplicate, rename, or delete your saved
            projects.
          </p>
        </div>
        <Button asChild>
          <Link href="/tools/website-prompt-builder">
            <Plus className="mr-2 h-4 w-4" />
            New Website Prompt
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
      {loading ? (
        <div className="flex min-h-48 items-center justify-center">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading saved prompts…
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
            <FilePlus2 className="mb-4 h-10 w-10 text-muted-foreground" />
            <h2 className="text-xl font-semibold">No website prompts yet</h2>
            <p className="mb-5 mt-2 text-muted-foreground">
              Create your first detailed website brief in seven simple steps.
            </p>
            <Button asChild>
              <Link href="/tools/website-prompt-builder">Create a prompt</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardContent className="p-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-semibold">
                        {project.project_name}
                      </h2>
                      <Badge variant="secondary">{project.status}</Badge>
                      <Badge variant="outline">{project.target_ai}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {project.business_name} ·{" "}
                      {project.industry || "Industry not specified"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Created{" "}
                      {new Date(project.created_at).toLocaleDateString()} ·
                      Updated{" "}
                      {new Date(project.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link
                        href={`/tools/website-prompt-builder?project=${project.id}`}
                      >
                        <Edit3 className="mr-2 h-4 w-4" />
                        Open & Edit
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copy(project)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => download(project)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => duplicate(project)}
                    >
                      Duplicate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rename(project)}
                    >
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => remove(project)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
