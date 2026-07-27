"use client";

import * as React from "react";
import { Clock, Search, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

interface SearchHistoryItem {
  id: string;
  query: string;
  city: string;
  businessType: string;
  resultCount: number;
  timestamp: string;
}

export function SearchHistory() {
  const router = useRouter();
  const [history, setHistory] = React.useState<SearchHistoryItem[]>([]);

  React.useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("searchHistory") || "[]");
    setHistory(stored.slice(0, 10));
  }, []);

  const handleClear = () => {
    localStorage.removeItem("searchHistory");
    setHistory([]);
  };

  const handleClick = (item: SearchHistoryItem) => {
    const params = new URLSearchParams();
    if (item.query) params.set("q", item.query);
    if (item.city) params.set("city", item.city);
    if (item.businessType) params.set("type", item.businessType);
    router.push(`/search?${params.toString()}`);
  };

  if (history.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Recent Searches
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <Trash2 className="h-4 w-4 mr-1.5" />
          Clear
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {history.map((item) => (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {item.query || `${item.businessType} in ${item.city}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.resultCount} results — {new Date(item.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                {item.city && <Badge variant="outline" className="text-xs">{item.city}</Badge>}
                {item.businessType && <Badge variant="outline" className="text-xs">{item.businessType}</Badge>}
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
