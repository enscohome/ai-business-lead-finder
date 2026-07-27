"use client";

import * as React from "react";
import Link from "next/link";
import { Phone, MapPin, MessageCircle, Calendar, Edit2, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SavedLead } from "@/types";
import { getStatusColor, getOpportunityColor, formatPhoneNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface LeadCardProps {
  lead: SavedLead;
  onUpdateStatus: (id: string, status: SavedLead["status"]) => void;
  onDelete: (id: string) => void;
  onEditNotes: (id: string, notes: string) => void;
}

export function LeadCard({ lead, onUpdateStatus, onDelete, onEditNotes }: LeadCardProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [notes, setNotes] = React.useState(lead.notes);

  const handleSaveNotes = () => {
    onEditNotes(lead.id, notes);
    setIsEditing(false);
  };

  const handleCall = () => {
    window.location.href = `tel:${lead.business.phone}`;
  };

  const handleWhatsApp = () => {
    const cleanPhone = lead.business.phone.replace(/\D/g, "");
    window.open(`https://wa.me/234${cleanPhone.startsWith("0") ? cleanPhone.slice(1) : cleanPhone}`, "_blank");
  };

  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <Link 
              href={`/lead/${lead.business.id}?data=${encodeURIComponent(JSON.stringify(lead.business))}`}
              className="hover:underline"
            >
              <h3 className="font-semibold text-lg leading-tight truncate">
                {lead.business.name}
              </h3>
            </Link>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs font-normal">
                {lead.business.businessType}
              </Badge>
              <Badge 
                variant="outline" 
                className={cn("text-xs capitalize", getStatusColor(lead.status))}
              >
                {lead.status}
              </Badge>
              <Badge 
                variant="outline" 
                className={cn("text-xs capitalize", getOpportunityColor(lead.business.opportunityScore))}
              >
                {lead.business.opportunityScore}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onUpdateStatus(lead.id, "contacted")}>
                Mark as Contacted
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus(lead.id, "interested")}>
                Mark as Interested
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus(lead.id, "closed")}>
                Mark as Closed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus(lead.id, "archived")}>
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(lead.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 shrink-0" />
            <span>{formatPhoneNumber(lead.business.phone)}</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{lead.business.address}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>Saved {new Date(lead.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-4">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-[80px] p-3 text-sm rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Add notes about this lead..."
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveNotes}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => setIsEditing(true)}
              className="group cursor-pointer"
            >
              {lead.notes ? (
                <p className="text-sm text-muted-foreground line-clamp-3 group-hover:bg-accent/50 rounded p-2 -mx-2 transition-colors">
                  {lead.notes}
                </p>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground hover:bg-accent/50 rounded p-2 -mx-2 transition-colors">
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Click to add notes</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleCall}>
            <Phone className="h-4 w-4 mr-1.5" />
            Call
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={handleWhatsApp}>
            <MessageCircle className="h-4 w-4 mr-1.5" />
            WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
