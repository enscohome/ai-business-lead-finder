import type { Business, OpportunityService, OpportunityScore } from "@/types";

export const opportunityServices: Array<{ value: OpportunityService; label: string }> = [
  { value: "website-design", label: "Website design" },
  { value: "ai-automation", label: "AI automation" },
  { value: "seo", label: "SEO" },
  { value: "social-media-management", label: "Social media management" },
  { value: "graphic-design", label: "Graphic design" },
  { value: "digital-marketing", label: "Digital marketing" },
  { value: "other", label: "Another service" },
];

export function getServiceLabel(service: OpportunityService, customService?: string) {
  if (service === "other" && customService?.trim()) return customService.trim();
  return opportunityServices.find((option) => option.value === service)?.label || "Digital services";
}

type ScoringInput = Pick<Business, "websiteStatus" | "phone" | "rating" | "reviewCount"> & {
  service: OpportunityService;
  customService?: string;
};

export function scoreOpportunity(input: ScoringInput): {
  score: OpportunityScore;
  reasons: string[];
} {
  const reasons: string[] = [];
  let points = 0;
  const reviews = input.reviewCount || 0;

  if (input.service === "website-design") {
    if (input.websiteStatus === "none") {
      points += 4;
      reasons.push("No website was found, creating a clear website-design need.");
    } else if (input.websiteStatus === "outdated") {
      points += 3;
      reasons.push("The current website appears dated and may benefit from a redesign.");
    } else {
      reasons.push("A modern website is already present, so redesign need is less urgent.");
    }
  } else if (input.service === "seo") {
    if (input.websiteStatus === "none") {
      points += 2;
      reasons.push("No website was found, so an SEO engagement would first need a web foundation.");
    } else if (input.websiteStatus === "outdated") {
      points += 3;
      reasons.push("An older website may have technical and content SEO gaps.");
    } else {
      points += 1;
      reasons.push("A website exists, providing a foundation for an SEO review and improvements.");
    }
    if (reviews < 20) {
      points += 1;
      reasons.push("Low Google review volume suggests room to improve local search visibility.");
    }
  } else if (input.service === "ai-automation") {
    if (input.phone) {
      points += 2;
      reasons.push("A public phone channel could support automated enquiry handling or follow-up.");
    }
    if (reviews >= 20) {
      points += 2;
      reasons.push("Established customer activity suggests repetitive workflows that may benefit from automation.");
    } else {
      points += 1;
      reasons.push("Available listing data suggests a smaller operation; automation value should be validated in discovery.");
    }
  } else if (input.service === "social-media-management") {
    points += reviews < 20 ? 2 : 1;
    reasons.push(
      reviews < 20
        ? "Low Google engagement suggests an opportunity to strengthen ongoing digital visibility."
        : "Existing customer engagement could provide material for a consistent social content program."
    );
    reasons.push("Google Places does not confirm social-account activity, so this opportunity needs manual validation.");
  } else if (input.service === "graphic-design") {
    points += input.websiteStatus === "outdated" || input.websiteStatus === "none" ? 2 : 1;
    reasons.push(
      input.websiteStatus === "modern"
        ? "A modern site reduces obvious brand-design gaps, though campaign creative may still be useful."
        : "A missing or dated website can indicate a broader need for refreshed brand and campaign assets."
    );
  } else if (input.service === "digital-marketing") {
    if (reviews < 20) {
      points += 2;
      reasons.push("Low review volume suggests room to increase awareness and customer acquisition.");
    } else {
      points += 1;
      reasons.push("Existing customer interest provides a base for broader acquisition campaigns.");
    }
    if (input.websiteStatus !== "modern") {
      points += 2;
      reasons.push("The web presence may need improvement before or alongside paid campaigns.");
    }
  } else {
    points += input.websiteStatus !== "modern" ? 2 : 1;
    reasons.push(
      `Listing signals indicate a possible fit for ${getServiceLabel(input.service, input.customService)}, but the specific need should be confirmed directly.`
    );
  }

  if (!input.phone) {
    points = Math.max(0, points - 1);
    reasons.push("No public phone number was found, which may make outreach more difficult.");
  }

  const score: OpportunityScore = points >= 4 ? "high" : points >= 2 ? "medium" : "low";
  return { score, reasons: reasons.slice(0, 3) };
}
