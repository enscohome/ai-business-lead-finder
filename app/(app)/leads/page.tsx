"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadCard } from "@/components/leads/lead-card";
import { LeadFilters } from "@/components/leads/lead-filters";
import { BulkActions } from "@/components/leads/bulk-actions";
import { EmptyState } from "@/components/empty-state";
import { useLeads } from "@/hooks/use-db";
import { SavedLead } from "@/types";
import Link from "next/link";

export default function LeadsPage() {
  const router = useRouter();
  const { leads, isLoading, updateStatus, updateNotes, deleteLead, exportToCSV } = useLeads();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [exportError, setExportError] = React.useState("");

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = 
      lead.business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.business.businessType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.business.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleExportCSV = async () => {
    setExportError("");
    const permission = await fetch("/api/account/usage", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ feature: "csv_export" }) });
    if (!permission.ok) { const data = await permission.json(); setExportError(data.error || "CSV export is unavailable on your plan."); return; }
    const csv = exportToCSV();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkDelete = () => {
    selectedIds.forEach((id) => deleteLead(id));
    setSelectedIds(new Set());
  };

  const handleBulkStatus = (status: SavedLead["status"]) => {
    selectedIds.forEach((id) => updateStatus(id, status));
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Saved Leads</h1>
          </div>
          <p className="text-muted-foreground">Manage and track your business leads</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => router.push("/search")}>
            <Plus className="h-4 w-4 mr-2" />
            Find New Leads
          </Button>
        </div>
      </div>
      {exportError && <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700">{exportError} <Link href="/pricing" className="font-medium underline">View plans</Link></p>}

      <LeadFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        totalLeads={leads.length}
        filteredCount={filteredLeads.length}
      />

      <BulkActions
        selectedCount={selectedIds.size}
        onExport={handleExportCSV}
        onDelete={handleBulkDelete}
        onMarkContacted={() => handleBulkStatus("contacted")}
        onMarkInterested={() => handleBulkStatus("interested")}
        onMarkClosed={() => handleBulkStatus("closed")}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {filteredLeads.length === 0 ? (
        <EmptyState
          icon={Users}
          title={leads.length === 0 ? "No saved leads yet" : "No leads match your filters"}
          description={
            leads.length === 0 
              ? "Start searching for businesses and save leads to track your sales pipeline."
              : "Try adjusting your search or filter criteria."
          }
          action={
            leads.length === 0 
              ? { label: "Search for Leads", onClick: () => router.push("/search") }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onUpdateStatus={updateStatus}
              onDelete={deleteLead}
              onEditNotes={updateNotes}
            />
          ))}
        </div>
      )}
    </div>
  );
}
