"use client";

import * as React from "react";
import { BusinessCard } from "./business-card";
import { Business, SavedLead } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface SearchResultsProps {
  businesses: Business[];
  savedLeads: SavedLead[];
  onSaveLead: (business: Business) => void;
  isLoading?: boolean;
}

export function SearchResults({ 
  businesses, 
  savedLeads, 
  onSaveLead, 
  isLoading 
}: SearchResultsProps) {
  const savedBusinessIds = new Set(savedLeads.map((lead) => lead.businessId));

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-5 space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No results found</h3>
        <p className="text-muted-foreground mt-1">
          Try adjusting your search criteria or filters
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Found <span className="font-medium text-foreground">{businesses.length}</span> businesses
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {businesses.map((business) => (
          <BusinessCard
            key={business.id}
            business={business}
            onSave={onSaveLead}
            isSaved={savedBusinessIds.has(business.id)}
          />
        ))}
      </div>
    </div>
  );
}
