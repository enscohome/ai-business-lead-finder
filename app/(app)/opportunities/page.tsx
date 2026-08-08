"use client";
import * as React from "react";
import Link from "next/link";
import { Bookmark, BriefcaseBusiness, FileText, MessageSquare, Plus, Search } from "lucide-react";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { OPPORTUNITY_CATEGORIES, type JobOpportunity } from "@/types/job-opportunity";

const initialFilters = { q: "", category: "all", country: "all", location: "all", budget: "all", experience: "all", date: "all", status: "approved" };
export default function OpportunitiesPage() {
  const [filters, setFilters] = React.useState(initialFilters), [rows, setRows] = React.useState<JobOpportunity[]>([]), [loading, setLoading] = React.useState(true), [error, setError] = React.useState("");
  const load = React.useCallback(async () => {
    setLoading(true); setError("");
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value && value !== "all"));
    const response = await fetch(`/api/opportunities?${query}`); const data = await response.json();
    if (response.ok) setRows(data.opportunities); else setError(data.error); setLoading(false);
  }, [filters]);
  React.useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);
  const set = (key: keyof typeof filters, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  return <div className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="flex items-center gap-2"><BriefcaseBusiness className="h-6 w-6 text-primary" /><h1 className="text-3xl font-bold">Job Opportunities</h1></div><p className="mt-1 max-w-2xl text-muted-foreground">Discover approved client work, submit professional applications, and continue shortlisted conversations privately.</p></div><Button asChild><Link href="/opportunities/new"><Plus className="mr-2 h-4 w-4" />Post an opportunity</Link></Button></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Shortcut href="/opportunities/saved" icon={Bookmark} label="Saved opportunities" />
      <Shortcut href="/opportunities/my-applications" icon={FileText} label="My applications" />
      <Shortcut href="/opportunities/my-posts" icon={BriefcaseBusiness} label="My posted opportunities" />
      <Shortcut href="/messages" icon={MessageSquare} label="Messages" />
    </div>
    <Card><CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="relative sm:col-span-2"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search opportunities" value={filters.q} onChange={(e) => set("q", e.target.value)} /></div>
      <Filter value={filters.category} onChange={(v) => set("category", v)} placeholder="Category" options={OPPORTUNITY_CATEGORIES.map((v) => [v, v])} />
      <Filter value={filters.country} onChange={(v) => set("country", v)} placeholder="Country" options={[["NG", "Nigeria"]]} />
      <Filter value={filters.location} onChange={(v) => set("location", v)} placeholder="Work location" options={[["remote","Remote"],["onsite","Onsite"],["hybrid","Hybrid"]]} />
      <Filter value={filters.budget} onChange={(v) => set("budget", v)} placeholder="Budget type" options={[["fixed","Fixed-price"],["hourly","Hourly"],["negotiable","Negotiable"]]} />
      <Filter value={filters.experience} onChange={(v) => set("experience", v)} placeholder="Experience" options={[["entry","Entry"],["intermediate","Intermediate"],["expert","Expert"]]} />
      <Filter value={filters.date} onChange={(v) => set("date", v)} placeholder="Date posted" options={[["1","Past 24 hours"],["7","Past 7 days"],["30","Past 30 days"]]} />
      <Filter value={filters.status} onChange={(v) => set("status", v)} placeholder="Status" options={[["approved","Approved and accepting applications"]]} />
    </CardContent></Card>
    {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
    {loading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1,2,3,4,5,6].map((i) => <Skeleton key={i} className="h-80 rounded-xl" />)}</div> : rows.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((row) => <OpportunityCard key={row.id} opportunity={row} />)}</div> : <Card><CardContent className="py-16 text-center"><BriefcaseBusiness className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><h2 className="font-semibold">No approved opportunities match these filters</h2><p className="mt-1 text-sm text-muted-foreground">Try another filter or post work for the community.</p></CardContent></Card>}
  </div>;
}
function Shortcut({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) { return <Button asChild variant="outline" className="h-auto justify-start py-3"><Link href={href}><Icon className="mr-2 h-4 w-4" />{label}</Link></Button>; }
function Filter({ value, onChange, placeholder, options }: { value: string; onChange: (value: string) => void; placeholder: string; options: readonly (readonly [string,string])[] }) { return <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent><SelectItem value="all">All {placeholder.toLowerCase()}</SelectItem>{options.map(([key,label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select>; }
