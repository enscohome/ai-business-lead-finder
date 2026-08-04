import type { AppNotification } from "@/types/notification";
const profile = new Set([
  "freelancer_profile",
  "profile_update",
  "freelancer_profile_update",
]);
const reviews = new Set([
  "review_request",
  "client_review_request",
  "freelancer_review_request",
  "submitted_review",
  "review_submitted",
  "client_review",
  "freelancer_review",
]);
const verificationDecisions = new Set([
  "verification_decision",
  "verification_approved",
  "verification_rejected",
  "verification_suspended",
]);
const verificationApplications = new Set([
  "verification_application",
  "freelancer_verification_application",
  "verification_submitted",
]);
const payments = new Set([
  "subscription",
  "subscription_created",
  "subscription_cancelled",
  "subscription_expired",
  "payment",
  "payment_success",
  "payment_failed",
]);
const websitePromptBuilder = new Set([
  "website_prompt_builder_usage",
  "website_prompt_builder",
]);
const websitePromptPricing = new Set(["website_prompt_builder_expired"]);
const automationBuilder = new Set([
  "automation_workflow_generated",
  "automation_workflow_regenerated",
  "automation_workflow_validation_failed",
  "automation_workflow_project",
]);
const jobTypes = new Set([
  "job",
  "job_post",
  "job_approved",
  "job_rejected",
  "job_status_changed",
  "job_application",
  "application_submitted",
  "application_viewed",
  "application_shortlisted",
  "application_accepted",
  "application_rejected",
  "job_invitation",
  "invitation_received",
  "invitation_accepted",
  "invitation_declined",
  "opportunity_approved",
  "opportunity_rejected",
  "opportunity_completed",
]);
const opportunityApplicantTypes = new Set(["application_submitted", "opportunity_application_received"]);
const opportunityApplicationTypes = new Set(["application_shortlisted", "application_accepted", "application_rejected"]);
const opportunityMessageTypes = new Set(["opportunity_message", "new_opportunity_message"]);
export function getNotificationDestination(
  n: Pick<
    AppNotification,
    "type" | "related_entity_type" | "related_entity_id"
  >,
): string | null {
  const type = (n.type || "").toLowerCase(),
    entity = (n.related_entity_type || "").toLowerCase(),
    id = n.related_entity_id;
  if (profile.has(type) || profile.has(entity)) return "/profile";
  if (reviews.has(type) || reviews.has(entity)) return "/client-reviews";
  if (verificationDecisions.has(type)) return "/profile?section=verification";
  if (verificationApplications.has(type))
    return "/admin/freelancers?tab=verification";
  if (payments.has(type) || payments.has(entity)) return "/pricing";
  if (websitePromptPricing.has(type)) return "/pricing";
  if (websitePromptBuilder.has(type) || websitePromptBuilder.has(entity))
    return "/tools/website-prompt-builder";
  if (
    automationBuilder.has(type) ||
    automationBuilder.has(entity) ||
    type.startsWith("automation_workflow_")
  )
    return id
      ? `/tools/automation-builder?project=${encodeURIComponent(id)}`
      : "/tools/automation-builder/history";
  if (
    opportunityMessageTypes.has(type) || entity === "opportunity_conversation"
  )
    return id ? `/messages/${encodeURIComponent(id)}` : "/messages";
  if (opportunityApplicantTypes.has(type) || entity === "opportunity_applicants")
    return id ? `/opportunities/${encodeURIComponent(id)}/applications` : "/opportunities/my-posts";
  if (opportunityApplicationTypes.has(type) || entity === "opportunity_application")
    return id ? `/opportunities/my-applications?application=${encodeURIComponent(id)}` : "/opportunities/my-applications";
  if (
    jobTypes.has(type) ||
    ["job", "job_post", "opportunity", "job_invitation"].includes(entity)
  )
    return id ? `/opportunities/${encodeURIComponent(id)}` : "/opportunities";
  if (type.startsWith("admin_moderation") || entity === "admin_moderation")
    return "/admin/freelancers";
  return null;
}
export function isDestinationAvailable(destination: string | null) {
  return Boolean(destination);
}
