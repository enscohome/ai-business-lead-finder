import "server-only";
import type { OpportunityStatus } from "@/types/job-opportunity";

export const MANAGED_TRANSITIONS: Record<OpportunityStatus, OpportunityStatus[]> = {
  pending_review: ["changes_requested", "approved", "rejected", "cancelled"],
  changes_requested: ["pending_review", "rejected", "cancelled"],
  approved: ["awaiting_assignment", "assigned", "rejected", "cancelled"],
  awaiting_assignment: ["assigned", "cancelled"],
  assigned: ["in_progress", "awaiting_assignment", "cancelled"],
  in_progress: ["ready_for_review", "revision_requested", "awaiting_assignment", "cancelled"],
  ready_for_review: ["revision_requested", "completed", "awaiting_assignment", "cancelled"],
  revision_requested: ["in_progress", "ready_for_review", "awaiting_assignment", "cancelled"],
  completed: [],
  rejected: [],
  cancelled: [],
};

export function canTransitionOpportunity(
  current: string,
  next: string,
): next is OpportunityStatus {
  return Boolean(
    MANAGED_TRANSITIONS[current as OpportunityStatus]?.includes(
      next as OpportunityStatus,
    ),
  );
}

export function statusNotification(status: OpportunityStatus) {
  const map: Partial<Record<OpportunityStatus, { title: string; message: string }>> = {
    changes_requested: {
      title: "Changes requested",
      message: "LeadPilot requested changes to your job request.",
    },
    approved: {
      title: "Job request approved",
      message: "Your job request was approved by LeadPilot.",
    },
    assigned: {
      title: "Worker assigned",
      message: "A freelancer was assigned to your project.",
    },
    in_progress: {
      title: "Work has started",
      message: "Your assigned freelancer has started work.",
    },
    ready_for_review: {
      title: "Work ready for review",
      message: "Project work is ready for client review.",
    },
    revision_requested: {
      title: "Project revisions requested",
      message: "Corrections were requested for this project.",
    },
    completed: {
      title: "Project completed",
      message: "This LeadPilot project was marked completed.",
    },
    rejected: {
      title: "Job request rejected",
      message: "Your job request was not approved.",
    },
    cancelled: {
      title: "Project cancelled",
      message: "This LeadPilot project was cancelled.",
    },
  };
  return map[status] || null;
}
