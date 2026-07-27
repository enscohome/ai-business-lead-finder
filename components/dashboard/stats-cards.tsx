"use client";

import { Search, Users, Phone, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardsProps {
  totalSearches: number;
  savedLeads: number;
  contactedLeads: number;
  closedDeals: number;
}

export function StatsCards({
  totalSearches,
  savedLeads,
  contactedLeads,
  closedDeals,
}: StatsCardsProps) {
  const stats = [
    {
      title: "Total Searches",
      value: totalSearches,
      icon: Search,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Saved Leads",
      value: savedLeads,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Contacted",
      value: contactedLeads,
      icon: Phone,
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "Closed Deals",
      value: closedDeals,
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
