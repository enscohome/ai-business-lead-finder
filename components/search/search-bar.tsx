"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Building2, SlidersHorizontal } from "lucide-react";
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
import { opportunityServices } from "@/lib/opportunity";
import type { OpportunityService } from "@/types";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { getCity, getCountry, getRegion, locationData } from "@/lib/locations";

const businessTypes = [
  "Restaurant", "Hotel", "Salon", "Pharmacy", "Cafe", "Bakery",
  "Barbershop", "Spa", "Gym", "Clinic", "Dental", "Law Firm",
  "Real Estate", "Auto Repair", "Electronics", "Boutique", "Supermarket",
  "Bookstore", "Photography", "Catering", "Event Planning", "Travel Agency",
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
  const [state, setState] = React.useState(searchParams.get("state") || "");
  const [country, setCountry] = React.useState(searchParams.get("country") || "");
  const [area, setArea] = React.useState(searchParams.get("area") || "");
  const [service, setService] = React.useState<OpportunityService>(
    (searchParams.get("service") as OpportunityService) || "website-design"
  );
  const [customService, setCustomService] = React.useState(searchParams.get("customService") || "");
  const [showFilters, setShowFilters] = React.useState(false);

  const regionOptions = getCountry(country)?.regions.map((region) => region.name) || [];
  const cityOptions = getRegion(country, state)?.cities.map((locationCity) => locationCity.name) || [];
  const areaOptions = getCity(country, state, city)?.areas || [];

  const handleCountryChange = (nextCountry: string) => {
    setCountry(nextCountry);
    setState("");
    setCity("");
    setArea("");
  };

  const handleStateChange = (nextState: string) => {
    setState(nextState);
    setCity("");
    setArea("");
  };

  const handleCityChange = (nextCity: string) => {
    setCity(nextCity);
    setArea("");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (businessType) params.set("type", businessType);
    if (city) params.set("city", city);
    if (state.trim()) params.set("state", state.trim());
    if (country.trim()) params.set("country", country.trim());
    if (area.trim()) params.set("area", area.trim());
    params.set("service", service);
    if (service === "other" && customService.trim()) params.set("customService", customService.trim());

    router.push(`/search?${params.toString()}`);
  };

  const isHero = variant === "hero";

  return (
    <div className={cn("w-full", className)}>
      <form onSubmit={handleSearch} className="space-y-4">
        <div className={cn(
          "flex flex-col gap-2 sm:flex-row sm:flex-wrap",
          isHero && "sm:items-stretch"
        )}>
          {/* Main search input */}
          <div className="relative flex-1 min-w-[220px]">
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

              <SearchableSelect
                value={country}
                options={locationData.map((locationCountry) => locationCountry.name)}
                onValueChange={handleCountryChange}
                placeholder="Country"
                searchPlaceholder="Search countries..."
                className={cn(isHero && "h-14")}
              />

              <SearchableSelect
                value={state}
                options={regionOptions}
                onValueChange={handleStateChange}
                placeholder="State / Region"
                searchPlaceholder="Search states or regions..."
                disabled={!country}
                className={cn(isHero && "h-14")}
              />

              <SearchableSelect
                value={city}
                options={cityOptions}
                onValueChange={handleCityChange}
                placeholder="City"
                searchPlaceholder="Search cities..."
                disabled={!state}
                className={cn(isHero && "h-14")}
              />

              <SearchableSelect
                value={area}
                options={areaOptions}
                onValueChange={setArea}
                placeholder="Area / Neighbourhood"
                searchPlaceholder="Search areas or neighbourhoods..."
                disabled={!city}
                optional
                className={cn("sm:w-[240px]", isHero && "h-14")}
              />

              <Select value={service} onValueChange={(value) => setService(value as OpportunityService)}>
                <SelectTrigger className={cn("w-full", !isHero && "lg:w-[220px]")}>
                  <SlidersHorizontal className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Service" />
                </SelectTrigger>
                <SelectContent>
                  {opportunityServices.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          {(showFilters || isHero) && service === "other" && (
            <Input
              value={customService}
              onChange={(event) => setCustomService(event.target.value)}
              placeholder="Describe another service"
              className={cn("w-full", !isHero && "lg:w-[220px]", isHero && "h-14")}
              required
            />
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
