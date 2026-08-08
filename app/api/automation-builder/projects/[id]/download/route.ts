import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  automationEntitlementError,
  getAutomationBuilderEntitlement,
} from "@/lib/automation-builder/entitlement";
import { buildAutomationSetupGuidePdf } from "@/lib/automation-builder/pdf";
import {
  AUTOMATION_PROJECT_SELECT,
  projectToArtifact,
} from "@/lib/automation-builder/projects";
import {
  automationSlug,
  findAutomationSecrets,
} from "@/lib/automation-builder/security";
import { validateN8nWorkflow } from "@/lib/automation-builder/validator";
import type { AutomationWorkflowProject } from "@/types/automation-workflow";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const entitlement = await getAutomationBuilderEntitlement(supabase, user);
  if (!entitlement.allowed && !entitlement.readOnly) {
    const denied = automationEntitlementError(entitlement);
    return NextResponse.json(denied.body, { status: denied.status });
  }
  const format = request.nextUrl.searchParams.get("format");
  if (!['json', 'pdf'].includes(format || ""))
    return NextResponse.json(
      { error: "Download format must be json or pdf." },
      { status: 400 },
    );
  const { data, error } = await supabase
    .from("automation_workflow_projects")
    .select(AUTOMATION_PROJECT_SELECT)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data)
    return NextResponse.json(
      { error: "Automation project not found." },
      { status: 404 },
    );
  const project = data as AutomationWorkflowProject;
  const validation = validateN8nWorkflow(project.generated_workflow);
  const secrets = findAutomationSecrets({
    requirements: project.requirements,
    plan: project.workflow_plan,
    workflow: project.generated_workflow,
    summary: project.workflow_summary,
  });
  if (
    project.validation_status !== "valid" ||
    !validation.valid ||
    secrets.length
  )
    return NextResponse.json(
      {
        error:
          "This workflow is not currently safe to download. Regenerate it and resolve every validation error first.",
        code: "DOWNLOAD_BLOCKED_BY_VALIDATION",
        validation,
      },
      { status: 422 },
    );
  const { error: auditError } = await supabase
    .from("automation_workflow_generation_events")
    .insert({
    user_id: user.id,
    project_id: project.id,
    event_type: format === "pdf" ? "pdf_downloaded" : "json_downloaded",
    validation_status: "valid",
    details: { generation_count: project.generation_count },
  });
  if (auditError)
    return NextResponse.json(
      {
        error:
          "The download could not be recorded safely, so the file was not released.",
      },
      { status: 503 },
    );
  const filename = automationSlug(project.project_name);
  if (format === "json")
    return new NextResponse(
      JSON.stringify(project.generated_workflow, null, 2),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}-workflow.json"`,
          "Cache-Control": "private, no-store",
        },
      },
    );
  const pdf = buildAutomationSetupGuidePdf(projectToArtifact(project));
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}-setup-guide.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
