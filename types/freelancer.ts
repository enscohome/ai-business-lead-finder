export type VerificationStatus =
  "not_verified" | "pending" | "verified" | "rejected" | "suspended";
export type AvailabilityStatus = "available" | "limited" | "unavailable";
export type ReviewModerationStatus =
  "pending" | "approved" | "hidden" | "removed";

export interface VisibilitySettings {
  location: boolean;
  hourlyRate: boolean;
  phone: boolean;
  email: boolean;
  socialLinks: boolean;
  workExperience: boolean;
  education: boolean;
  availability: boolean;
}

export interface TimelineItem {
  id?: string;
  title: string;
  organization: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}
export interface EducationItem {
  id?: string;
  school: string;
  qualification: string;
  field?: string;
  startDate?: string;
  endDate?: string;
}
export interface CertificationItem {
  id?: string;
  name: string;
  issuer: string;
  issueDate?: string;
  credentialUrl?: string;
}

export interface FreelancerProfile {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  displayName: string;
  professionalTitle: string;
  profileImageUrl: string | null;
  coverImageUrl: string | null;
  shortBio: string;
  fullBio: string;
  country: string;
  city: string;
  languages: string[];
  skills: string[];
  services: string[];
  industries: string[];
  yearsOfExperience: number | null;
  hourlyRate: number | null;
  startingPrice: number | null;
  currency: string;
  availabilityStatus: AvailabilityStatus;
  preferredContactMethod: string;
  contactEmail: string;
  contactPhone: string;
  profileVisibility: "public" | "private";
  visibility: VisibilitySettings;
  workExperience: TimelineItem[];
  education: EducationItem[];
  certifications: CertificationItem[];
  profileCompletionPercentage: number;
  verificationStatus: VerificationStatus;
  isLeadPilotVerified?: boolean;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  profileUrl: string;
  isVisible: boolean;
}
export interface PortfolioProject {
  id: string;
  projectTitle: string;
  description: string;
  coverImageUrl: string | null;
  projectImages: string[];
  skillsUsed: string[];
  category: string;
  clientName: string | null;
  completionDate: string | null;
  projectUrl: string | null;
  externalUrl: string | null;
  displayOrder: number;
  isVisible: boolean;
}
export interface ClientReview {
  id: string;
  clientName: string;
  clientCompany: string | null;
  projectTitle: string;
  rating: number;
  reviewText: string;
  verificationStatus: "verified_client";
  moderationStatus: ReviewModerationStatus;
  createdAt: string;
}
export interface RatingSummary {
  average: number;
  total: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}
export interface PublicFreelancerProfile {
  profile: FreelancerProfile;
  socialLinks: SocialLink[];
  portfolio: PortfolioProject[];
  reviews: ClientReview[];
  ratings: RatingSummary;
}
