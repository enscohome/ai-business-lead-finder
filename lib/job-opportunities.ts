import { safeExternalUrl, sanitizeText } from "@/lib/freelancer";
import {
  OPPORTUNITY_CATEGORIES,
  REPORT_REASONS,
} from "@/types/job-opportunity";

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const WORK_LOCATION_TYPES = ["remote", "onsite", "hybrid"] as const;
export const BUDGET_TYPES = ["fixed", "hourly", "negotiable"] as const;
export const EXPERIENCE_LEVELS = ["entry", "intermediate", "expert"] as const;
export const OPPORTUNITY_STATUSES = [
  "pending_review",
  "open",
  "paused",
  "closed",
  "completed",
  "rejected",
] as const;

export function validUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function list(value: unknown, max = 20, itemMax = 80) {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  return source
    .map((item) => sanitizeText(item, itemMax))
    .filter(Boolean)
    .slice(0, max);
}

export function safeMoney(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0
    ? Math.round(number * 100) / 100
    : null;
}

export function sanitizeOpportunityInput(body: Record<string, unknown>) {
  const category = sanitizeText(body.category, 80);
  const workLocation = sanitizeText(body.workLocationType, 20).toLowerCase();
  const budgetType = sanitizeText(body.budgetType, 20).toLowerCase();
  const experience = sanitizeText(body.experienceLevel, 20).toLowerCase();
  const country = sanitizeText(body.countryCode, 2).toUpperCase();
  const deadline = sanitizeText(body.applicationDeadline, 40);
  const budgetMin = safeMoney(body.budgetMin);
  const budgetMax = safeMoney(body.budgetMax);
  return {
    title: sanitizeText(body.title, 160),
    description: sanitizeText(body.description, 12000),
    category: OPPORTUNITY_CATEGORIES.includes(category as any)
      ? category
      : "Other",
    skills: list(body.skills, 20, 60),
    country_code: /^[A-Z]{2}$/.test(country) ? country : "NG",
    city: sanitizeText(body.city, 120) || null,
    work_location_type: WORK_LOCATION_TYPES.includes(workLocation as any)
      ? workLocation
      : "remote",
    budget_type: BUDGET_TYPES.includes(budgetType as any)
      ? budgetType
      : "negotiable",
    budget_min: budgetMin,
    budget_max: budgetMax,
    currency: sanitizeText(body.currency, 3).toUpperCase() || "NGN",
    experience_level: EXPERIENCE_LEVELS.includes(experience as any)
      ? experience
      : "intermediate",
    delivery_time: sanitizeText(body.deliveryTime, 160),
    application_deadline:
      deadline && !Number.isNaN(Date.parse(deadline))
        ? new Date(deadline).toISOString()
        : null,
    application_questions: list(body.applicationQuestions, 10, 300),
  };
}

export function opportunityInputError(input: ReturnType<typeof sanitizeOpportunityInput>) {
  if (input.title.length < 5) return "Use a descriptive title of at least 5 characters.";
  if (input.description.length < 30) return "Describe the work in at least 30 characters.";
  if (!input.skills.length) return "Add at least one required skill.";
  if (input.budget_min !== null && input.budget_max !== null && input.budget_max < input.budget_min)
    return "Maximum budget cannot be lower than minimum budget.";
  if (input.application_deadline && new Date(input.application_deadline) <= new Date())
    return "The application deadline must be in the future.";
  return null;
}

export function sanitizeApplicationInput(body: Record<string, unknown>) {
  return {
    proposal: sanitizeText(body.proposal, 5000),
    relevant_experience: sanitizeText(body.relevantExperience, 3000),
    estimated_delivery: sanitizeText(body.estimatedDelivery, 160),
    proposed_budget: safeMoney(body.proposedBudget),
    answers: list(body.answers, 10, 1000),
    portfolio_links: list(body.portfolioLinks, 10, 500)
      .map((url) => safeExternalUrl(url))
      .filter((url): url is string => Boolean(url)),
  };
}

export function applicationInputError(input: ReturnType<typeof sanitizeApplicationInput>) {
  if (input.proposal.length < 30) return "Write a proposal of at least 30 characters.";
  if (input.relevant_experience.length < 10) return "Briefly describe your relevant experience.";
  if (!input.estimated_delivery) return "Add an estimated delivery time.";
  return null;
}

export function sanitizeReportInput(body: Record<string, unknown>) {
  const reason = sanitizeText(body.reason, 40).toLowerCase();
  return {
    reason: REPORT_REASONS.includes(reason as any) ? reason : "other",
    explanation: sanitizeText(body.explanation, 2000),
  };
}

export function formatBudget(row: {
  budget_type: string;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
}) {
  if (row.budget_type === "negotiable") return "Negotiable";
  const formatter = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: row.currency || "NGN",
    maximumFractionDigits: 0,
  });
  if (row.budget_min !== null && row.budget_max !== null)
    return `${formatter.format(row.budget_min)} – ${formatter.format(row.budget_max)}${row.budget_type === "hourly" ? "/hr" : ""}`;
  const value = row.budget_min ?? row.budget_max;
  return value === null
    ? row.budget_type === "hourly" ? "Hourly budget" : "Fixed budget"
    : `${formatter.format(value)}${row.budget_type === "hourly" ? "/hr" : ""}`;
}

export function rateLimitWindow(hours = 24) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}
