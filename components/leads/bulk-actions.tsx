"use client";

import * as React from "react";
import { Download, Trash2, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BulkActionsProps {
  selectedCount: number;
  onExport: () => void;
  onDelete: () => void;
  onMarkContacted: () => void;
  onMarkInterested: () => void;
  onMarkClosed: () => void;
  onClearSelection: () => void;
}

export function BulkActions({
  selectedCount,
  onExport,
  onDelete,
  onMarkContacted,
  onMarkInterested,
  onMarkClosed,
  onClearSelection,
}: BulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10 animate-in fade-in slide-in-from-top-2">
      <span className="text-sm font-medium">
        {selectedCount} selected
      </span>
      <div className="h-4 w-px bg-border mx-2" />
      <Button variant="ghost" size="sm" onClick={onExport}>
        <Download className="h-4 w-4 mr-1.5" />
        Export
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <CheckCircle className="h-4 w-4 mr-1.5" />
            Mark as...
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onMarkContacted}>
            <Mail className="h-4 w-4 mr-2" />
            Contacted
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onMarkInterested}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Interested
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onMarkClosed}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Closed
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={onDelete}>
        <Trash2 className="h-4 w-4 mr-1.5" />
        Delete
      </Button>
      <Button variant="ghost" size="sm" onClick={onClearSelection}>
        Clear
      </Button>
    </div>
  );
}
