export const OPPORTUNITY_CATEGORIES = [
  "AI Automation",
  "Website Development",
  "App Development",
  "Graphic Design",
  "Social Media",
  "Content Writing",
  "Lead Generation",
  "Virtual Assistance",
  "Data and Research",
  "Other",
] as const;

export const REPORT_REASONS = [
  "scam_fraud",
  "spam",
  "harassment",
  "inappropriate_content",
  "misleading_opportunity",
  "illegal_work",
  "other",
] as const;

export type OpportunityStatus =
  | "pending_review"
  | "changes_requested"
  | "approved"
  | "awaiting_assignment"
  | "assigned"
  | "in_progress"
  | "ready_for_review"
  | "revision_requested"
  | "completed"
  | "rejected"
  | "cancelled";
export type ApplicationStatus =
  | "submitted"
  | "shortlisted"
  | "accepted"
  | "rejected"
  | "withdrawn";

export interface JobOpportunity {
  id: string;
  owner_id: string;
  client_user_id?: string | null;
  managed_client_name?: string | null;
  created_by?: string | null;
  private_owner_notes?: string;
  title: string;
  description: string;
  category: string;
  skills: string[];
  country_code: string;
  city: string | null;
  work_location_type: "remote" | "onsite" | "hybrid";
  budget_type: "fixed" | "hourly" | "negotiable";
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  experience_level: "entry" | "intermediate" | "expert";
  delivery_time: string;
  application_deadline: string | null;
  application_questions: string[];
  status: OpportunityStatus;
  moderation_reason: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  application_count?: number;
  shortlisted_count?: number;
  poster_name?: string;
  is_saved?: boolean;
  is_owner?: boolean;
}

export interface OpportunityApplication {
  id: string;
  opportunity_id: string;
  applicant_id: string;
  proposal: string;
  relevant_experience: string;
  estimated_delivery: string;
  proposed_budget: number | null;
  answers: string[];
  portfolio_links: string[];
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  opportunity?: JobOpportunity;
  freelancer?: Record<string, unknown> | null;
  conversation_id?: string | null;
}

export interface OpportunityConversation {
  id: string;
  opportunity_id: string;
  application_id: string | null;
  assignment_id?: string | null;
  job_poster_id: string;
  freelancer_id: string;
  status: "active" | "closed";
  poster_archived_at: string | null;
  freelancer_archived_at: string | null;
  poster_left_at: string | null;
  freelancer_left_at: string | null;
  created_at: string;
  updated_at: string;
  opportunity?: Pick<JobOpportunity, "id" | "title">;
  unread_count?: number;
  last_message?: string;
  other_name?: string;
  participants?: Array<{
    user_id: string;
    participant_role: "client" | "freelancer" | "owner";
    display_name?: string;
    is_verified?: boolean;
  }>;
}

export type AssignmentStatus =
  | "offered"
  | "accepted"
  | "in_progress"
  | "ready_for_review"
  | "revision_requested"
  | "completed"
  | "cancelled";

export interface OpportunityAssignment {
  id: string;
  opportunity_id: string;
  freelancer_id: string;
  assigned_by: string;
  status: AssignmentStatus;
  assigned_at: string;
  accepted_at: string | null;
  started_at: string | null;
  ready_for_review_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}
