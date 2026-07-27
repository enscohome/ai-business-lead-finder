"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, MapPin, Building2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const businessTypes = [
  "Restaurant", "Hotel", "Salon", "Pharmacy", "Cafe", "Bakery",
  "Barbershop", "Spa", "Gym", "Clinic", "Dental", "Law Firm",
  "Real Estate", "Auto Repair", "Electronics", "Boutique", "Supermarket",
  "Bookstore", "Photography", "Catering", "Event Planning", "Travel Agency",
];

const cities = [
  "Lagos", "Abuja", "Port Harcourt", "Ibadan", "Kano", "Enugu",
  "Benin City", "Kaduna", "Owerri", "Uyo", "Calabar", "Abeokuta",
];

interface SearchBarProps {
  className?: string;
  variant?: "hero" | "compact";
}

export function SearchBar({ className, variant = "compact" }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = React.useState(searchParams.get("q") || "");
  const [businessType, setBusinessType] = React.useState(searchParams.get("type") || "");
  const [city, setCity] = React.useState(searchParams.get("city") || "");
  const [showFilters, setShowFilters] = React.useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (businessType) params.set("type", businessType);
    if (city) params.set("city", city);

    router.push(`/search?${params.toString()}`);
  };

  const isHero = variant === "hero";

  return (
    <div className={cn("w-full", className)}>
      <form onSubmit={handleSearch} className="space-y-4">
        <div className={cn(
          "flex gap-2",
          isHero ? "flex-col sm:flex-row" : "flex-col lg:flex-row"
        )}>
          {/* Main search input */}
          <div className="relative flex-1">
            <Search className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground",
              isHero ? "h-5 w-5" : "h-4 w-4"
            )} />
            <Input
              type="text"
              placeholder={isHero ? "Search for businesses..." : "Search..."}
              className={cn(
                "pl-10",
                isHero && "h-14 text-lg"
              )}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Filters */}
          {(showFilters || isHero) && (
            <>
              <Select value={businessType} onValueChange={setBusinessType}>
                <SelectTrigger className={cn(
                  "w-full",
                  !isHero && "lg:w-[180px]"
                )}>
                  <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Business Type" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className={cn(
                  "w-full",
                  !isHero && "lg:w-[180px]"
                )}>
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          <Button 
            type="submit" 
            className={cn(
              isHero ? "h-14 px-8 text-lg" : ""
            )}
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>

        {/* Toggle filters button (compact only) */}
        {!isHero && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-muted-foreground"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
        )}
      </form>
    </div>
  );
}
