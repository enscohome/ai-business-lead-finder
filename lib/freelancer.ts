import type {
  FreelancerProfile,
  RatingSummary,
  VisibilitySettings,
} from "@/types/freelancer";

export const DEFAULT_VISIBILITY: VisibilitySettings = {
  location: true,
  hourlyRate: false,
  phone: false,
  email: false,
  socialLinks: true,
  workExperience: true,
  education: true,
  availability: true,
};
export const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "auth",
  "dashboard",
  "freelancer",
  "help",
  "leadpilot",
  "leadpilot-ai",
  "login",
  "moderator",
  "pricing",
  "profile",
  "review",
  "settings",
  "signup",
  "support",
  "verify",
]);
const BLOCKED_USERNAME_FRAGMENTS = [
  "fuck",
  "shit",
  "bitch",
  "nigger",
  "scam",
  "fraud",
];
export const SOCIAL_PLATFORMS = [
  "linkedin",
  "fiverr",
  "upwork",
  "freelancer",
  "github",
  "behance",
  "dribbble",
  "website",
  "instagram",
  "twitter",
  "youtube",
  "whatsapp",
] as const;
const PLATFORM_HOSTS: Record<string, string[]> = {
  linkedin: ["linkedin.com"],
  fiverr: ["fiverr.com"],
  upwork: ["upwork.com"],
  freelancer: ["freelancer.com"],
  github: ["github.com"],
  behance: ["behance.net"],
  dribbble: ["dribbble.com"],
  instagram: ["instagram.com"],
  twitter: ["x.com", "twitter.com"],
  youtube: ["youtube.com", "youtu.be"],
  whatsapp: ["wa.me", "whatsapp.com"],
};

export function validateUsername(value: string) {
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9_-]{3,30}$/.test(username))
    return "Use 3–30 lowercase letters, numbers, hyphens or underscores.";
  if (RESERVED_USERNAMES.has(username)) return "That username is reserved.";
  if (
    BLOCKED_USERNAME_FRAGMENTS.some((fragment) => username.includes(fragment))
  )
    return "Choose a different professional username.";
  return null;
}

export function safeExternalUrl(value: string, platform?: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(
      platform === "whatsapp" && /^\+?[0-9\s()-]+$/.test(trimmed)
        ? `https://wa.me/${trimmed.replace(/\D/g, "")}`
        : trimmed,
    );
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (
      url.username ||
      url.password ||
      ["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname) ||
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname)
    )
      return null;
    const hosts = platform ? PLATFORM_HOSTS[platform] : undefined;
    if (
      hosts &&
      !hosts.some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
      )
    )
      return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function sanitizeText(value: unknown, max = 5000) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, max);
}

export function calculateProfileCompletion(
  profile: Partial<FreelancerProfile>,
  portfolioCount = 0,
  socialCount = 0,
) {
  const checks = [
    profile.profileImageUrl,
    profile.professionalTitle,
    profile.fullBio,
    profile.skills?.length,
    profile.services?.length,
    profile.country && profile.city,
    portfolioCount > 0,
    socialCount > 0,
    profile.preferredContactMethod &&
      (profile.contactEmail || profile.contactPhone),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function completionSuggestion(
  percent: number,
  profile: Partial<FreelancerProfile>,
  portfolioCount: number,
  socialCount: number,
) {
  if (!profile.profileImageUrl)
    return `Your profile is ${percent}% complete. Add a professional profile picture.`;
  if (!profile.fullBio)
    return `Your profile is ${percent}% complete. Add a detailed biography.`;
  if (!profile.skills?.length)
    return `Your profile is ${percent}% complete. Add your strongest skills.`;
  if (!profile.services?.length)
    return `Your profile is ${percent}% complete. Add the services you offer.`;
  if (!portfolioCount)
    return `Your profile is ${percent}% complete. Add a portfolio project to improve your profile.`;
  if (!socialCount)
    return `Your profile is ${percent}% complete. Add a professional or freelancing-platform link.`;
  return percent === 100
    ? "Your profile is complete and ready to share."
    : `Your profile is ${percent}% complete. Add contact information to finish it.`;
}

export function ratingSummary(ratings: number[]): RatingSummary {
  const distribution: RatingSummary["distribution"] = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  ratings.forEach((value) => {
    if (value >= 1 && value <= 5) distribution[value as 1 | 2 | 3 | 4 | 5] += 1;
  });
  const average = ratings.length
    ? Math.round(
        (ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10,
      ) / 10
    : 0;
  return { average, total: ratings.length, distribution };
}

export function mapProfile(row: any): FreelancerProfile {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username || "",
    fullName: row.full_name || "",
    displayName: row.display_name || "",
    professionalTitle: row.professional_title || "",
    profileImageUrl: row.profile_image_url,
    coverImageUrl: row.cover_image_url,
    shortBio: row.short_bio || "",
    fullBio: row.full_bio || "",
    country: row.country || "",
    city: row.city || "",
    languages: row.languages || [],
    skills: row.skills || [],
    services: row.services || [],
    industries: row.industries || [],
    yearsOfExperience: row.years_of_experience,
    hourlyRate: row.hourly_rate,
    startingPrice: row.starting_price,
    currency: row.currency || "NGN",
    availabilityStatus: row.availability_status || "available",
    preferredContactMethod: row.preferred_contact_method || "email",
    contactEmail: row.contact_email || "",
    contactPhone: row.contact_phone || "",
    profileVisibility: row.profile_visibility || "public",
    visibility: { ...DEFAULT_VISIBILITY, ...(row.visibility_settings || {}) },
    workExperience: row.work_experience || [],
    education: row.education || [],
    certifications: row.certifications || [],
    profileCompletionPercentage: row.profile_completion_percentage || 0,
    verificationStatus: row.verification_status || "not_verified",
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
