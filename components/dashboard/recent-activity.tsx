"use client";

import { Search, Bookmark, Phone, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: "search" | "save" | "contact" | "close";
  description: string;
  timestamp: string;
}

interface RecentActivityProps {
  activities: Activity[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const getIcon = (type: Activity["type"]) => {
    switch (type) {
      case "search":
        return Search;
      case "save":
        return Bookmark;
      case "contact":
        return Phone;
      case "close":
        return CheckCircle;
    }
  };

  const getColor = (type: Activity["type"]) => {
    switch (type) {
      case "search":
        return "text-blue-600 bg-blue-500/10";
      case "save":
        return "text-purple-600 bg-purple-500/10";
      case "contact":
        return "text-amber-600 bg-amber-500/10";
      case "close":
        return "text-emerald-600 bg-emerald-500/10";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent activity
            </p>
          ) : (
            activities.map((activity) => {
              const Icon = getIcon(activity.type);
              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg shrink-0", getColor(activity.type))}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
