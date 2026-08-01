"use server";

import { createClient } from "@/lib/supabase/server";
import { Business, SavedLead, SearchHistory } from "@/types";

// ==================== SAVED LEADS ====================

export async function getSavedLeads(): Promise<SavedLead[]> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Fallback to localStorage for demo/development
      if (typeof window !== "undefined") {
        return JSON.parse(localStorage.getItem("savedLeads") || "[]");
      }
      return [];
    }

    const { data, error } = await supabase
      .from("saved_leads")
      .select(`
        *,
        business:businesses(*)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("getSavedLeads error:", error);
    return [];
  }
}

export async function saveLead(business: Business): Promise<SavedLead | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Fallback: store in localStorage
      if (typeof window !== "undefined") {
        const leads = JSON.parse(localStorage.getItem("savedLeads") || "[]");
        const existing = leads.find((l: SavedLead) => l.businessId === business.id);
        if (existing) return existing;

        const newLead: SavedLead = {
          id: crypto.randomUUID(),
          userId: "demo-user",
          businessId: business.id,
          business,
          notes: "",
          status: "new",
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem("savedLeads", JSON.stringify([newLead, ...leads]));
        return newLead;
      }
      return null;
    }

    // Google provider content remains transient. Persist the provider record ID and
    // neutral placeholders only; user-created CRM data lives in saved_leads.
    const isGoogle = business.source === "google_places";
    const { error: bizError } = await supabase
      .from("businesses")
      .upsert({
        id: business.id,
        name: isGoogle ? "Provider business record" : business.name,
        phone: isGoogle ? null : business.phone,
        address: isGoogle ? null : business.address,
        city: isGoogle ? "" : business.city,
        state: isGoogle ? null : business.state,
        country: isGoogle ? "Nigeria" : business.country,
        business_type: isGoogle ? "Business" : business.businessType,
        website: isGoogle ? null : business.website,
        website_status: isGoogle ? "none" : business.websiteStatus,
        opportunity_score: isGoogle ? "low" : business.opportunityScore,
        google_maps_url: null,
        latitude: isGoogle ? null : business.latitude,
        longitude: isGoogle ? null : business.longitude,
        rating: isGoogle ? null : business.rating,
        review_count: isGoogle ? 0 : business.reviewCount,
        source: business.source,
      });

    if (bizError) throw bizError;

    // Then save the lead
    const { data, error } = await supabase
      .from("saved_leads")
      .upsert({
        user_id: user.id,
        business_id: business.id,
        notes: "",
        status: "new",
        tags: [],
      })
      .select("*, business:businesses(*)")
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("saveLead error:", error);
    return null;
  }
}

export async function updateLeadStatus(
  leadId: string, 
  status: SavedLead["status"]
): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      if (typeof window !== "undefined") {
        const leads = JSON.parse(localStorage.getItem("savedLeads") || "[]");
        const updated = leads.map((l: SavedLead) =>
          l.id === leadId ? { ...l, status, updatedAt: new Date().toISOString() } : l
        );
        localStorage.setItem("savedLeads", JSON.stringify(updated));
      }
      return true;
    }

    const { error } = await supabase
      .from("saved_leads")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", leadId)
      .eq("user_id", user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("updateLeadStatus error:", error);
    return false;
  }
}

export async function updateLeadNotes(
  leadId: string, 
  notes: string
): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      if (typeof window !== "undefined") {
        const leads = JSON.parse(localStorage.getItem("savedLeads") || "[]");
        const updated = leads.map((l: SavedLead) =>
          l.id === leadId ? { ...l, notes, updatedAt: new Date().toISOString() } : l
        );
        localStorage.setItem("savedLeads", JSON.stringify(updated));
      }
      return true;
    }

    const { error } = await supabase
      .from("saved_leads")
      .update({ notes, updated_at: new Date().toISOString() })
      .eq("id", leadId)
      .eq("user_id", user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("updateLeadNotes error:", error);
    return false;
  }
}

export async function deleteLead(leadId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      if (typeof window !== "undefined") {
        const leads = JSON.parse(localStorage.getItem("savedLeads") || "[]");
        const updated = leads.filter((l: SavedLead) => l.id !== leadId);
        localStorage.setItem("savedLeads", JSON.stringify(updated));
      }
      return true;
    }

    const { error } = await supabase
      .from("saved_leads")
      .delete()
      .eq("id", leadId)
      .eq("user_id", user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("deleteLead error:", error);
    return false;
  }
}

// ==================== SEARCH HISTORY ====================

export async function saveSearchHistory(
  query: string,
  city: string,
  state: string,
  country: string,
  businessType: string,
  resultCount: number,
  area: string = ""
): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      if (typeof window !== "undefined") {
        const history = JSON.parse(localStorage.getItem("searchHistory") || "[]");
        history.unshift({
          id: crypto.randomUUID(),
          query: query || `${businessType || "Businesses"} in ${city}`,
          city,
          area,
          state,
          country,
          businessType,
          resultCount,
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem("searchHistory", JSON.stringify(history.slice(0, 20)));
      }
      return;
    }

    await supabase.from("search_history").insert({
      user_id: user.id,
      query: area ? `${query || businessType || "Businesses"} in ${area}` : query,
      city,
      state,
      country,
      business_type: businessType,
      result_count: resultCount,
    });
  } catch (error) {
    console.error("saveSearchHistory error:", error);
  }
}

// ==================== ACTIVITIES ====================

export async function logActivity(
  type: string,
  description: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      if (typeof window !== "undefined") {
        const activities = JSON.parse(localStorage.getItem("activities") || "[]");
        activities.unshift({
          id: crypto.randomUUID(),
          type,
          description,
          metadata,
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem("activities", JSON.stringify(activities.slice(0, 20)));
      }
      return;
    }

    await supabase.from("activities").insert({
      user_id: user.id,
      type,
      description,
      metadata,
    });
  } catch (error) {
    console.error("logActivity error:", error);
  }
}

// ==================== USER PROFILE ====================

export async function getUserProfile() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error && error.code === "PGRST116") {
      // Profile doesn't exist, create it
      const { data: newProfile, error: createError } = await supabase
        .from("user_profiles")
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0],
          avatar_url: user.user_metadata?.avatar_url,
          plan: "free",
          searches_today: 0,
          searches_limit: 20,
          leads_limit: 5,
        })
        .select()
        .single();

      if (createError) throw createError;
      return newProfile;
    }

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("getUserProfile error:", error);
    return null;
  }
}

export async function incrementSearchCount(): Promise<number> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      if (typeof window !== "undefined") {
        const count = parseInt(localStorage.getItem("totalSearches") || "0") + 1;
        localStorage.setItem("totalSearches", count.toString());
        return count;
      }
      return 0;
    }

    const { data, error } = await supabase.rpc("increment_search_count", {
      user_id: user.id,
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error("incrementSearchCount error:", error);
    return 0;
  }
}
