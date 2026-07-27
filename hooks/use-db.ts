"use client";

import * as React from "react";
import { Business, SavedLead } from "@/types";
import { generateId } from "@/lib/utils";

// This hook provides a unified interface that works with or without Supabase
// When Supabase is connected, it calls server actions
// When not connected, it falls back to localStorage

export function useLeads() {
  const [leads, setLeads] = React.useState<SavedLead[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = () => {
    const stored = JSON.parse(localStorage.getItem("savedLeads") || "[]");
    setLeads(stored);
    setIsLoading(false);
  };

  const saveLead = (business: Business): boolean => {
    const existing = leads.find((l) => l.businessId === business.id);
    if (existing) {
      // Toggle: remove if already saved
      const updated = leads.filter((l) => l.businessId !== business.id);
      setLeads(updated);
      localStorage.setItem("savedLeads", JSON.stringify(updated));
      logActivity("save", `Removed ${business.name} from saved leads`);
      return false;
    }

    const newLead: SavedLead = {
      id: generateId(),
      userId: "user-1",
      businessId: business.id,
      business,
      notes: "",
      status: "new",
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newLead, ...leads];
    setLeads(updated);
    localStorage.setItem("savedLeads", JSON.stringify(updated));
    logActivity("save", `Saved ${business.name} as a lead`);
    return true;
  };

  const updateStatus = (leadId: string, status: SavedLead["status"]) => {
    const updated = leads.map((l) =>
      l.id === leadId ? { ...l, status, updatedAt: new Date().toISOString() } : l
    );
    setLeads(updated);
    localStorage.setItem("savedLeads", JSON.stringify(updated));

    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      logActivity("contact", `Marked ${lead.business.name} as ${status}`);
    }
  };

  const updateNotes = (leadId: string, notes: string) => {
    const updated = leads.map((l) =>
      l.id === leadId ? { ...l, notes, updatedAt: new Date().toISOString() } : l
    );
    setLeads(updated);
    localStorage.setItem("savedLeads", JSON.stringify(updated));
  };

  const deleteLead = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    const updated = leads.filter((l) => l.id !== leadId);
    setLeads(updated);
    localStorage.setItem("savedLeads", JSON.stringify(updated));

    if (lead) {
      logActivity("contact", `Deleted ${lead.business.name} from leads`);
    }
  };

  const exportToCSV = (): string => {
    const headers = [
      "Business Name", "Business Type", "Phone", "Address", "City", "State",
      "Country", "Website", "Website Status", "Opportunity Score",
      "Lead Status", "Notes", "Saved Date",
    ];

    const rows = leads.map((lead) => [
      lead.business.name,
      lead.business.businessType,
      lead.business.phone,
      lead.business.address,
      lead.business.city,
      lead.business.state,
      lead.business.country,
      lead.business.website || "",
      lead.business.websiteStatus,
      lead.business.opportunityScore,
      lead.status,
      lead.notes,
      new Date(lead.createdAt).toLocaleDateString(),
    ]);

    return [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");
  };

  return {
    leads,
    isLoading,
    saveLead,
    updateStatus,
    updateNotes,
    deleteLead,
    exportToCSV,
    refresh: loadLeads,
  };
}

export function useSearchHistory() {
  const [history, setHistory] = React.useState<any[]>([]);

  React.useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("searchHistory") || "[]");
    setHistory(stored);
  }, []);

  const addSearch = (
    query: string,
    city: string,
    businessType: string,
    resultCount: number
  ) => {
    const newEntry = {
      id: generateId(),
      query: query || `${businessType || "Businesses"} in ${city}`,
      city,
      businessType,
      resultCount,
      timestamp: new Date().toISOString(),
    };
    const updated = [newEntry, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem("searchHistory", JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("searchHistory");
  };

  return { history, addSearch, clearHistory };
}

export function useActivities() {
  const [activities, setActivities] = React.useState<any[]>([]);

  React.useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("activities") || "[]");
    setActivities(stored);
  }, []);

  const refresh = () => {
    const stored = JSON.parse(localStorage.getItem("activities") || "[]");
    setActivities(stored);
  };

  return { activities, refresh };
}

function logActivity(type: string, description: string) {
  const activities = JSON.parse(localStorage.getItem("activities") || "[]");
  activities.unshift({
    id: generateId(),
    type,
    description,
    timestamp: new Date().toISOString(),
  });
  localStorage.setItem("activities", JSON.stringify(activities.slice(0, 20)));
}
