"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, ArrowRight, Sparkles, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { SearchBar } from "@/components/search/search-bar";
import { SavedLead } from "@/types";
import { getPlan } from "@/lib/plans";

export default function DashboardPage() {
  const router = useRouter();
  const [savedLeads, setSavedLeads] = React.useState<SavedLead[]>([]);
  const [activities, setActivities] = React.useState<any[]>([]);
  const [totalSearches, setTotalSearches] = React.useState(0);
  const [plan, setPlan] = React.useState("free");
  const [searchLimit, setSearchLimit] = React.useState(20);
  const [leadsLimit, setLeadsLimit] = React.useState<number | null>(5);
  const [profileCompletion, setProfileCompletion] = React.useState(0);
  React.useEffect(() => {
    const leads = JSON.parse(localStorage.getItem("savedLeads") || "[]");
    setSavedLeads(leads);

    const acts = JSON.parse(localStorage.getItem("activities") || "[]");
    setActivities(acts.slice(0, 5));
  fetch("/api/account/usage").then(response => response.ok ? response.json() : null).then((usage) => {
    if (usage) { setTotalSearches(usage.searchesUsed); setPlan(usage.plan.id); setSearchLimit(usage.searchesLimit); setLeadsLimit(usage.savedLeadsLimit); }
  });
  fetch("/api/freelancer/profile").then(response => response.ok ? response.json() : null).then(data => setProfileCompletion(data?.profile?.profileCompletionPercentage || 0));
  }, []);

  const stats = {
  totalSearches: totalSearches,
    savedLeads: savedLeads.length,
    contactedLeads: savedLeads.filter((l: SavedLead) => l.status === "contacted" || l.status === "interested" || l.status === "closed").length,
    closedDeals: savedLeads.filter((l: SavedLead) => l.status === "closed").length,
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">
            LeadPilot AI
          </h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Discover local businesses, analyze their digital presence, and generate AI-powered sales outreach — all in one platform.
        </p>
      </div>

      {/* Quick Search */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6">
    <React.Suspense fallback={<div>Loading search...</div>}>
  <SearchBar variant="hero" />
</React.Suspense>
        </CardContent>
      </Card>

      {/* Stats */}
      <StatsCards {...stats} />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/search")}>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <CardTitle className="text-lg mb-1">Find New Leads</CardTitle>
              <CardDescription>Search for businesses in any city</CardDescription>
            </div>
            <div className="p-3 rounded-full bg-primary/10">
              <Search className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/leads")}>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <CardTitle className="text-lg mb-1">Manage Saved Leads</CardTitle>
              <CardDescription>{stats.savedLeads} leads in your pipeline</CardDescription>
            </div>
            <div className="p-3 rounded-full bg-emerald-500/10">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/profile")}>
          <CardContent className="p-6 flex items-center justify-between">
            <div><CardTitle className="text-lg mb-1">Freelancer Profile</CardTitle><CardDescription>{profileCompletion}% complete · Build your shareable portfolio</CardDescription></div>
            <div className="p-3 rounded-full bg-indigo-500/10"><UserCircle className="h-5 w-5 text-indigo-600" /></div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity activities={activities} />
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-lg">Current Plan & Usage</CardTitle>
              <Badge variant="secondary">{getPlan(plan).name}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Searches this month</span>
                  <span className="font-medium">{stats.totalSearches} / {searchLimit}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min((stats.totalSearches / Math.max(searchLimit, 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Saved Leads</span>
                  <span className="font-medium">{stats.savedLeads} / {leadsLimit ?? "Unlimited"}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full transition-all"
                    style={{ width: `${leadsLimit === null ? 0 : Math.min((stats.savedLeads / Math.max(leadsLimit, 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => router.push("/search")}>
                Start Searching
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
