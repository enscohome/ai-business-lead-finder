export interface Business {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  businessType: string;
  website: string | null;
  websiteStatus: "modern" | "outdated" | "none";
  opportunityScore: "low" | "medium" | "high";
  googleMapsUrl: string;
  latitude: number;
  longitude: number;
  rating?: number;
  reviewCount?: number;
  createdAt: string;
}

export interface SavedLead {
  id: string;
  userId: string;
  businessId: string;
  business: Business;
  notes: string;
  status: "new" | "contacted" | "interested" | "closed" | "archived";
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchHistory {
  id: string;
  userId: string;
  query: string;
  city: string;
  state: string;
  country: string;
  businessType: string;
  resultCount: number;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  plan: "free" | "pro" | "agency";
  searchesToday: number;
  searchesLimit: number;
  createdAt: string;
}

export interface AISalesTool {
  type: "website_pitch" | "whatsapp_message" | "cold_call_script" | "follow_up";
  title: string;
  content: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  period: "month" | "year";
  features: string[];
  highlighted?: boolean;
}
