export type PlanId = "free" | "starter" | "pro" | "agency";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceNgn: number;
  searchesPerMonth: number;
  savedLeads: number | null;
  aiMessagesPerMonth: number;
  websitePromptGenerationsPerMonth: number;
  csvExportsPerMonth: number;
  teamMembers: number;
  features: string[];
  highlighted?: boolean;
}

export const DEFAULT_PLAN: PlanId = "free";
export const LAUNCH_COUNTRY = "Nigeria";
export const LAUNCH_CURRENCY = "NGN";

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free Plan",
    priceNgn: 0,
    searchesPerMonth: 20,
    savedLeads: 5,
    aiMessagesPerMonth: 5,
    websitePromptGenerationsPerMonth: 0,
    csvExportsPerMonth: 0,
    teamMembers: 1,
    features: [
      "20 business searches per month",
      "Basic service and location filters",
      "High, Medium and Low Opportunity scoring",
      "Maximum of 5 saved leads",
      "Limited AI outreach-message generation",
      "No CSV export",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter Plan",
    priceNgn: 4900,
    searchesPerMonth: 150,
    savedLeads: 100,
    aiMessagesPerMonth: 50,
    websitePromptGenerationsPerMonth: 50,
    csvExportsPerMonth: 5,
    teamMembers: 1,
    features: [
      "150 business searches per month",
      "All service and location filters",
      "AI-generated WhatsApp and email outreach messages",
      "Website Prompt Builder",
      "AI Automation Builder for n8n",
      "Maximum of 100 saved leads",
      "Business contact information",
      "Limited CSV exports",
      "One user only",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro Plan",
    priceNgn: 8900,
    searchesPerMonth: 500,
    savedLeads: null,
    aiMessagesPerMonth: 250,
    websitePromptGenerationsPerMonth: 250,
    csvExportsPerMonth: 100,
    teamMembers: 1,
    highlighted: true,
    features: [
      "500 business searches per month",
      "All advanced filters",
      "Website Prompt Builder",
      "AI Automation Builder for n8n",
      "Full opportunity explanations",
      "Larger AI outreach allowance",
      "Unlimited saved leads",
      "CSV export",
      "Lead-search history",
      "Priority support",
    ],
  },
  agency: {
    id: "agency",
    name: "Agency Plan",
    priceNgn: 19900,
    searchesPerMonth: 1500,
    savedLeads: null,
    aiMessagesPerMonth: 750,
    websitePromptGenerationsPerMonth: 750,
    csvExportsPerMonth: 500,
    teamMembers: 3,
    features: [
      "1,500 business searches per month",
      "Up to 3 team members",
      "Shared saved leads",
      "Website Prompt Builder",
      "AI Automation Builder for n8n",
      "Bulk CSV export",
      "Advanced filters",
      "Larger AI outreach allowance",
      "Priority support",
    ],
  },
};

export const WEBSITE_PROMPT_PAID_PLANS: PlanId[] = ["starter", "pro", "agency"];
export function isWebsitePromptPaidPlan(value: unknown): value is PlanId {
  return isPlanId(value) && WEBSITE_PROMPT_PAID_PLANS.includes(value);
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in PLANS;
}

export function getPlan(value: unknown): PlanDefinition {
  return PLANS[isPlanId(value) ? value : DEFAULT_PLAN];
}

export function currentBillingPeriod(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  return { start: start.toISOString(), end: end.toISOString() };
}
