"use client";

import * as React from "react";
import Link from "next/link";
import { Phone, MapPin, ExternalLink, Star, MessageCircle, Bookmark, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Business } from "@/types";
import { getOpportunityColor, formatPhoneNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface BusinessCardProps {
  business: Business;
  onSave?: (business: Business) => void;
  isSaved?: boolean;
}

export function BusinessCard({ business, onSave, isSaved }: BusinessCardProps) {
  const handleCall = () => {
    window.location.href = `tel:${business.phone}`;
  };

  const handleWhatsApp = () => {
    const cleanPhone = business.phone.replace(/\D/g, "");
    window.open(`https://wa.me/234${cleanPhone.startsWith("0") ? cleanPhone.slice(1) : cleanPhone}`, "_blank");
  };

  const handleSave = () => {
    onSave?.(business);
  };

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border-border/60">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <Link 
              href={`/lead/${business.id}?data=${encodeURIComponent(JSON.stringify(business))}`}
              className="hover:underline"
            >
              <h3 className="font-semibold text-lg leading-tight truncate">
                {business.name}
              </h3>
            </Link>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs font-normal">
                {business.businessType}
              </Badge>
              {business.source && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {business.source === "google_places" ? "Live Google Places" : "Demo data"}
                </Badge>
              )}
              {business.rating && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span>{business.rating}</span>
                  <span>({business.reviewCount})</span>
                </div>
              )}
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={cn("shrink-0 capitalize", getOpportunityColor(business.opportunityScore))}
          >
            {business.opportunityScore} Opportunity
          </Badge>
        </div>

        <div className="mb-4 rounded-lg bg-muted/50 p-3 text-sm">
          <p className="font-medium">Best fit: {business.targetServiceLabel}</p>
          <p className="mt-1 text-muted-foreground">
            {business.opportunityReasons?.[0] || "Opportunity based on the available business listing signals."}
          </p>
        </div>

        {/* Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 shrink-0" />
            <span className="truncate">{formatPhoneNumber(business.phone)}</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{business.address}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
            {business.website ? (
              <a 
                href={business.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate flex items-center gap-1"
              >
                Website Found
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="text-red-500 font-medium">No Website</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={handleCall}
          >
            <Phone className="h-4 w-4 mr-1.5" />
            Call
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="h-4 w-4 mr-1.5" />
            WhatsApp
          </Button>
          <Button
            variant={isSaved ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={handleSave}
          >
            <Bookmark className={cn("h-4 w-4 mr-1.5", isSaved && "fill-current")} />
            {isSaved ? "Saved" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
