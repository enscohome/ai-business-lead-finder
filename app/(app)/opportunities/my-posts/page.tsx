"use client";
import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { JobOpportunity } from "@/types/job-opportunity";

const statuses = ["all","pending_review","open","paused","closed","completed","rejected"];
export default function MyPostsPage() {
  const [status, setStatus] = React.useState("all"), [rows, setRows] = React.useState<JobOpportunity[]>([]), [message, setMessage] = React.useState("");
  React.useEffect(() => { fetch(`/api/opportunities?mode=my-posts&status=${status}`).then(async (r) => { const d = await r.json(); if (r.ok) setRows(d.opportunities); else setMessage(d.error); }); }, [status]);
  return <div className="mx-auto max-w-7xl space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">My posted opportunities</h1><p className="text-muted-foreground">Manage moderation, applicants and hiring status.</p></div><Button asChild><Link href="/opportunities/new"><Plus className="mr-2 h-4 w-4" />Post opportunity</Link></Button></div><Tabs value={status} onValueChange={setStatus}><TabsList className="h-auto flex-wrap justify-start">{statuses.map((item) => <TabsTrigger key={item} value={item} className="capitalize">{item.replace("_", " ")}</TabsTrigger>)}</TabsList></Tabs>{message && <p role="alert" className="text-destructive">{message}</p>}<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((row) => <OpportunityCard key={row.id} opportunity={row} />)}</div>{!rows.length && !message && <p className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">No opportunities in this status.</p>}</div>;
}
