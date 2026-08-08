import type {
  AutomationArtifact,
  AutomationWorkflowProject,
  WorkflowValidationResult,
} from "@/types/automation-workflow";

export const AUTOMATION_PROJECT_SELECT =
  "id,project_name,client_name,business_type,automation_category,customer_problem,requirements,workflow_plan,generated_workflow,workflow_summary,required_credentials,supported_nodes,validation_status,validation_errors,target_platform,target_n8n_version,generation_count,status,created_at,updated_at";

export function projectToArtifact(
  project: AutomationWorkflowProject,
): AutomationArtifact {
  const validation: WorkflowValidationResult = {
    valid: project.validation_status === "valid",
    errors: project.validation_errors || [],
    warnings: project.workflow_plan?.compatibilityNotes || [],
    repaired: false,
  };
  return {
    requirements: project.requirements,
    plan: project.workflow_plan,
    workflow: project.generated_workflow,
    summary: project.workflow_summary,
    requiredCredentials: project.required_credentials || [],
    testingInstructions: [
      "Import into an isolated n8n test project with the workflow inactive.",
      "Connect credentials manually and replace every placeholder.",
      "Test the normal path, every condition branch, and at least one forced failure.",
      "Review execution data before activating the workflow with real customer data.",
    ],
    validation,
    source: "structured-template",
  };
}
