"use client";
import * as React from "react";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import type { JobOpportunity } from "@/types/job-opportunity";
export default function SavedOpportunitiesPage() {
  const [rows, setRows] = React.useState<JobOpportunity[]>([]), [loading, setLoading] = React.useState(true);
  React.useEffect(() => { fetch("/api/opportunities?mode=saved").then((r) => r.json()).then((d) => setRows(d.opportunities || [])).finally(() => setLoading(false)); }, []);
  return <div className="mx-auto max-w-7xl space-y-6"><div><h1 className="text-3xl font-bold">Saved opportunities</h1><p className="text-muted-foreground">A private shortlist of approved work you may want to apply for.</p></div>{loading ? <p>Loading…</p> : rows.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((row) => <OpportunityCard key={row.id} opportunity={row} onSaved={(saved) => !saved && setRows((current) => current.filter((item) => item.id !== row.id))} />)}</div> : <p className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">You have not saved any open opportunities.</p>}</div>;
}
