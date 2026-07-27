"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { SearchResults } from "@/components/search/search-results";
import { SearchBar } from "@/components/search/search-bar";
import { SearchHistory } from "@/components/search/search-history";
import { Business, SavedLead } from "@/types";
import { generateId } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle } from "lucide-react";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [businesses, setBusinesses] = React.useState<Business[]>([]);
  const [savedLeads, setSavedLeads] = React.useState<SavedLead[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [searchCount, setSearchCount] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const query = searchParams.get("q") || "";
  const type = searchParams.get("type") || "";
  const city = searchParams.get("city") || "";

  React.useEffect(() => {
    const leads = JSON.parse(localStorage.getItem("savedLeads") || "[]");
    setSavedLeads(leads);
    const count = parseInt(localStorage.getItem("totalSearches") || "0");
    setSearchCount(count);
  }, []);

  React.useEffect(() => {
    if (query || type || city) {
      performSearch();
    }
  }, [query, type, city]);

  const performSearch = async () => {
    setIsLoading(true);
    setHasSearched(true);
    setError(null);

    try {
      // Call the real API endpoint
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (city) params.set("city", city);
      if (type) params.set("type", type);

      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Search failed");
      }

      // If API returns empty and no key is configured, fallback to mock data
      if (data.businesses.length === 0 && data.error?.includes("not configured")) {
        const { searchBusinesses } = await import("@/lib/mock-data");
        const mockResults = searchBusinesses(query, city, undefined, "Nigeria");
        setBusinesses(mockResults);

        // Update search count
        const newCount = searchCount + 1;
        setSearchCount(newCount);
        localStorage.setItem("totalSearches", newCount.toString());

        // Save to history
        saveToHistory(query, city, type, mockResults.length);
        logActivity("search", `Searched for "${query || type || city}" (demo mode)`);
      } else {
        setBusinesses(data.businesses);

        // Update search count
        const newCount = searchCount + 1;
        setSearchCount(newCount);
        localStorage.setItem("totalSearches", newCount.toString());

        // Save to history
        saveToHistory(query, city, type, data.businesses.length);
        logActivity("search", `Searched for "${query || type || city}"`);
      }
    } catch (err) {
      console.error("Search error:", err);
      setError(err instanceof Error ? err.message : "Search failed");

      // Fallback to mock data on any error
      const { searchBusinesses } = await import("@/lib/mock-data");
      const mockResults = searchBusinesses(query, city, undefined, "Nigeria");
      setBusinesses(mockResults);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToHistory = (q: string, c: string, t: string, count: number) => {
    const history = JSON.parse(localStorage.getItem("searchHistory") || "[]");
    history.unshift({
      id: generateId(),
      query: q || `${t || "Businesses"} in ${c}`,
      city: c,
      businessType: t,
      resultCount: count,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem("searchHistory", JSON.stringify(history.slice(0, 20)));
  };

  const logActivity = (type: string, description: string) => {
    const activities = JSON.parse(localStorage.getItem("activities") || "[]");
    activities.unshift({
      id: generateId(),
      type,
      description,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem("activities", JSON.stringify(activities.slice(0, 20)));
  };

  const handleSaveLead = (business: Business) => {
    const existing = savedLeads.find((l) => l.businessId === business.id);
    if (existing) {
      const updated = savedLeads.filter((l) => l.businessId !== business.id);
      setSavedLeads(updated);
      localStorage.setItem("savedLeads", JSON.stringify(updated));
      logActivity("save", `Removed ${business.name} from saved leads`);
    } else {
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
      const updated = [newLead, ...savedLeads];
      setSavedLeads(updated);
      localStorage.setItem("savedLeads", JSON.stringify(updated));
      logActivity("save", `Saved ${business.name} as a lead`);
    }
  };

  const isLimitReached = searchCount >= 20;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Search Businesses</h1>
        </div>
        <p className="text-muted-foreground">
          Find local businesses and discover sales opportunities
        </p>
      </div>

      <Card>
        <CardContent className="p-5">
          <SearchBar />
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {isLimitReached && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Daily search limit reached</p>
            <p className="text-sm">You have used all 20 free searches today. Upgrade to Pro for unlimited searches.</p>
          </div>
        </div>
      )}

      {hasSearched && !isLoading && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{query || "All businesses"}</Badge>
          {city && <Badge variant="outline" className="text-xs">{city}</Badge>}
          {type && <Badge variant="outline" className="text-xs">{type}</Badge>}
        </div>
      )}

      {!hasSearched && <SearchHistory />}

      <SearchResults
        businesses={businesses}
        savedLeads={savedLeads}
        onSaveLead={handleSaveLead}
        isLoading={isLoading}
      />
    </div>
  );
}
