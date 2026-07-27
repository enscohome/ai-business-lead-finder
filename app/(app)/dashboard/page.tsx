"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { SearchBar } from "@/components/search/search-bar";
import { SubscriptionPlans } from "@/components/subscription-plans";
import { SavedLead } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const [savedLeads, setSavedLeads] = React.useState<SavedLead[]>([]);
  const [activities, setActivities] = React.useState<any[]>([]);

  React.useEffect(() => {
    const leads = JSON.parse(localStorage.getItem("savedLeads") || "[]");
    setSavedLeads(leads);

    const acts = JSON.parse(localStorage.getItem("activities") || "[]");
    setActivities(acts.slice(0, 5));
  }, []);

  const stats = {
    totalSearches:
  typeof window !== "undefined"
    ? parseInt(localStorage.getItem("totalSearches") || "0")
    : 0,
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
            AI Business Lead Finder
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity activities={activities} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Searches Today</span>
                  <span className="font-medium">{stats.totalSearches % 20} / 20</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(((stats.totalSearches % 20) / 20) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Saved Leads</span>
                  <span className="font-medium">{stats.savedLeads} / 50</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full transition-all"
                    style={{ width: `${Math.min((stats.savedLeads / 50) * 100, 100)}%` }}
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

      {/* Subscription Plans */}
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Choose Your Plan</h2>
          <p className="text-muted-foreground">Upgrade to unlock unlimited searches and AI-powered tools</p>
        </div>
        <SubscriptionPlans />
      </div>
    </div>
  );
}
