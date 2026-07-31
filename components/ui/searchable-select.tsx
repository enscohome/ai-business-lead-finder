"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface SearchableSelectProps {
  value: string;
  options: string[];
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  optional?: boolean;
  className?: string;
}

export function SearchableSelect({
  value,
  options,
  onValueChange,
  placeholder,
  searchPlaceholder = "Search options...",
  disabled = false,
  optional = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(search.trim().toLowerCase())
  );

  const selectValue = (nextValue: string) => {
    onValueChange(nextValue);
    setOpen(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen) setSearch("");
    }}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("w-full justify-between font-normal sm:w-[210px]", !value && "text-muted-foreground", className)}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{placeholder}</DialogTitle>
          <DialogDescription>Select an option from the available location data.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
        <div className="max-h-[50vh] space-y-1 overflow-y-auto rounded-md border p-1">
          {optional && value && (
            <button
              type="button"
              onClick={() => selectValue("")}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" /> Clear selection
            </button>
          )}
          {filteredOptions.map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => selectValue(option)}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <span>{option}</span>
              {option === value && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
          {filteredOptions.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matching options found.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
