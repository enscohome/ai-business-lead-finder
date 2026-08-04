"use client";
import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBudget } from "@/lib/job-opportunities";
import type { OpportunityApplication } from "@/types/job-opportunity";

export default function MyApplicationsPage() {
  const [rows, setRows] = React.useState<OpportunityApplication[]>([]), [loading, setLoading] = React.useState(true), [message, setMessage] = React.useState("");
  const load = React.useCallback(() => fetch("/api/opportunities/applications").then(async (r) => { const d = await r.json(); if (r.ok) setRows(d.applications); else setMessage(d.error); }).finally(() => setLoading(false)), []);
  React.useEffect(() => { load(); }, [load]);
  const withdraw = async (id: string) => { if (!window.confirm("Withdraw this application?")) return; const r = await fetch(`/api/opportunities/applications/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "withdrawn" }) }); if (r.ok) load(); else setMessage((await r.json()).error); };
  return <div className="mx-auto max-w-5xl space-y-6"><div><h1 className="text-3xl font-bold">My applications</h1><p className="text-muted-foreground">Track proposals, decisions and private conversations.</p></div>{message && <p role="alert" className="text-destructive">{message}</p>}{loading ? <p>Loading…</p> : rows.length ? <div className="space-y-4">{rows.map((row) => <Card key={row.id}><CardHeader className="pb-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="text-lg">{row.opportunity?.title || "Unavailable opportunity"}</CardTitle><p className="text-sm text-muted-foreground">Posted by {row.opportunity?.poster_name || "LeadPilot member"} · applied {new Date(row.created_at).toLocaleDateString("en-NG")}</p></div><Badge className="capitalize">{row.status}</Badge></div></CardHeader><CardContent className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm">Proposed: {row.proposed_budget === null ? "Not specified" : formatBudget({ budget_type: "fixed", budget_min: row.proposed_budget, budget_max: row.proposed_budget, currency: row.opportunity?.currency || "NGN" })}</p><div className="flex flex-wrap gap-2">{row.opportunity && <Button asChild variant="outline" size="sm"><Link href={`/opportunities/${row.opportunity_id}`}>Open opportunity</Link></Button>}{row.conversation_id && <Button asChild size="sm"><Link href={`/messages/${row.conversation_id}`}>Open conversation</Link></Button>}{row.status === "submitted" && <Button variant="destructive" size="sm" onClick={() => withdraw(row.id)}>Withdraw</Button>}</div></CardContent></Card>)}</div> : <p className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">You have not applied to any opportunities.</p>}</div>;
}
