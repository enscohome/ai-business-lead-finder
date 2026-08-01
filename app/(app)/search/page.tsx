"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchResults } from "@/components/search/search-results";
import { SearchBar } from "@/components/search/search-bar";
import { SearchHistory } from "@/components/search/search-history";
import { Business, SavedLead } from "@/types";
import { generateId } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle, X } from "lucide-react";
import Link from "next/link";
import { savedLeadWithoutProviderSnapshot } from "@/lib/provider-data";

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [businesses, setBusinesses] = React.useState<Business[]>([]);
  const [savedLeads, setSavedLeads] = React.useState<SavedLead[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [searchCount, setSearchCount] = React.useState(0);
  const [searchLimit, setSearchLimit] = React.useState(5);
  const [savedLeadLimit, setSavedLeadLimit] = React.useState<number | null>(5);
  const [error, setError] = React.useState<string | null>(null);

  const query = searchParams.get("q") || "";
  const type = searchParams.get("type") || "";
  const city = searchParams.get("city") || "";
  const area = searchParams.get("area") || "";
  const state = searchParams.get("state") || "";
  const country = searchParams.get("country") || "";
  const service = searchParams.get("service") || "website-design";
  const customService = searchParams.get("customService") || "";

  const removeLocationFilter = (level: "country" | "state" | "city" | "area") => {
    const params = new URLSearchParams(searchParams.toString());
    const dependentKeys: Record<typeof level, string[]> = {
      country: ["country", "state", "city", "area"],
      state: ["state", "city", "area"],
      city: ["city", "area"],
      area: ["area"],
    };
    dependentKeys[level].forEach((key) => params.delete(key));
    router.push(`/search?${params.toString()}`);
  };

  React.useEffect(() => {
    const leads = JSON.parse(localStorage.getItem("savedLeads") || "[]");
    setSavedLeads(leads);
    const count = parseInt(localStorage.getItem("totalSearches") || "0");
    setSearchCount(count);
    fetch("/api/account/usage").then(response => response.ok ? response.json() : null).then(usage => {
      if (usage) { setSearchCount(usage.searchesUsed); setSearchLimit(usage.searchesLimit); setSavedLeadLimit(usage.savedLeadsLimit); }
    });
  }, []);

  React.useEffect(() => {
    if (query || type || city || area) {
      performSearch();
    }
  }, [query, type, city, area, state, country, service, customService]);

  const performSearch = async () => {
    setIsLoading(true);
    setHasSearched(true);
    setError(null);

    try {
      // Call the real API endpoint
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (city) params.set("city", city);
      if (area) params.set("area", area);
      if (state) params.set("state", state);
      if (country) params.set("country", country);
      if (type) params.set("type", type);
      params.set("service", service);
      if (customService) params.set("customService", customService);

      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json();
if (typeof data.searchesToday === "number") {
  setSearchCount(data.searchesToday);
}

if (typeof data.searchesLimit === "number") {
  setSearchLimit(data.searchesLimit);
}
      if (!response.ok && (response.status === 401 || response.status === 429)) {
        setBusinesses([]);
        setError(data.error || "Search is unavailable.");
        return;
      }

      if (!response.ok && data.error?.includes("not configured")) {
        const { searchBusinesses } = await import("@/lib/mock-data");
        const mockResults = searchBusinesses(query, city, state, country || "Nigeria", service, customService, area);
        setBusinesses(mockResults);
        setError(null);
        saveToHistory(query, city, area, state, country, type, mockResults.length);
        logActivity("search", `Searched for "${query || type || city}"${area ? ` in ${area}` : ""} (demo mode)`);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Search failed");
      }

      // If API returns empty and no key is configured, fallback to mock data
      if (data.businesses.length === 0 && data.error?.includes("not configured")) {
        const { searchBusinesses } = await import("@/lib/mock-data");
        const mockResults = searchBusinesses(query, city, state, country || "Nigeria", service, customService, area);
        setBusinesses(mockResults);

       

        // Save to history
        saveToHistory(query, city, area, state, country, type, mockResults.length);
        logActivity("search", `Searched for "${query || type || city}" (demo mode)`);
      } else {
        setBusinesses(data.businesses);

        

        // Save to history
        saveToHistory(query, city, area, state, country, type, data.businesses.length);
        logActivity("search", `Searched for "${query || type || city}"`);
      }
    } catch (err) {
      console.error("Search error:", err);
      const message = err instanceof Error ? err.message : "Search failed";

      if (/logged in|unauthorized/i.test(message)) {
        setBusinesses([]);
        setError(message);
        return;
      }

      setError("Live search is unavailable. Showing demo results instead.");

      // Fallback to mock data on any error
      const { searchBusinesses } = await import("@/lib/mock-data");
      const mockResults = searchBusinesses(query, city, state, country || "Nigeria", service, customService, area);
      setBusinesses(mockResults);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToHistory = (
    q: string,
    c: string,
    a: string,
    region: string,
    nation: string,
    t: string,
    count: number
  ) => {
    const history = JSON.parse(localStorage.getItem("searchHistory") || "[]");
    history.unshift({
      id: generateId(),
      query: q || `${t || "Businesses"} in ${[a, c, region, nation].filter(Boolean).join(", ")}`,
      city: c,
      area: a,
      state: region,
      country: nation,
      businessType: t,
      service,
      customService,
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
      if (savedLeadLimit !== null && savedLeads.length >= savedLeadLimit) {
        setError(`You have reached your limit of ${savedLeadLimit} saved leads. Upgrade your plan to save more.`);
        return;
      }
      const newLead = savedLeadWithoutProviderSnapshot(business);
      const updated = [newLead, ...savedLeads];
      setSavedLeads(updated);
      localStorage.setItem("savedLeads", JSON.stringify(updated));
      logActivity("save", `Saved ${business.name} as a lead`);
    }
  };

const isLimitReached = searchCount >= searchLimit;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Search Businesses</h1>
        </div>
        <p className="text-muted-foreground">
          Find local businesses and discover sales opportunities
        </p>
        <p className="text-sm text-muted-foreground">
  {searchCount} of {searchLimit} searches used this month
</p>
      </div>

      <Card>
        <CardContent className="p-5">
          <SearchBar key={searchParams.toString()} />
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{error} {/limit|upgrade/i.test(error) && <Link href="/pricing" className="ml-1 font-medium underline">View plans</Link>}</p>
        </div>
      )}

      {isLimitReached && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
          <p className="text-sm">
  {`You have used all ${searchLimit} searches available this month.`}
  <br />
  <Link href="/pricing" className="font-medium underline">Choose a plan to continue.</Link>
</p>
          </div>
        </div>
      )}

     {hasSearched && !isLoading && !isLimitReached && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{query || "All businesses"}</Badge>
          {country && (
            <button type="button" onClick={() => removeLocationFilter("country")} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold hover:bg-accent">
              {country}<X className="ml-1 h-3 w-3" /><span className="sr-only">Remove country</span>
            </button>
          )}
          {state && (
            <button type="button" onClick={() => removeLocationFilter("state")} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold hover:bg-accent">
              {state}<X className="ml-1 h-3 w-3" /><span className="sr-only">Remove state or region</span>
            </button>
          )}
          {city && (
            <button type="button" onClick={() => removeLocationFilter("city")} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold hover:bg-accent">
              {city}<X className="ml-1 h-3 w-3" /><span className="sr-only">Remove city</span>
            </button>
          )}
          {area && (
            <button type="button" onClick={() => removeLocationFilter("area")} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold hover:bg-accent">
              {area}<X className="ml-1 h-3 w-3" /><span className="sr-only">Remove area or neighbourhood</span>
            </button>
          )}
          {type && <Badge variant="outline" className="text-xs">{type}</Badge>}
          <Badge variant="outline" className="text-xs">Service: {customService || service.replaceAll("-", " ")}</Badge>
        </div>
      )}

      {!hasSearched && <SearchHistory />}

     {!isLimitReached && (
  <SearchResults
    businesses={businesses}
    savedLeads={savedLeads}
    onSaveLead={handleSaveLead}
    isLoading={isLoading}
  />
)}
    </div>
  );
}
export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
