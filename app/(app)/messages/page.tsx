"use client";
import * as React from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { OpportunityConversation } from "@/types/job-opportunity";

export default function MessagesPage() {
  const [rows, setRows] = React.useState<OpportunityConversation[]>([]), [loading, setLoading] = React.useState(true), [error, setError] = React.useState("");
  React.useEffect(() => { fetch("/api/opportunities/conversations").then(async (r) => { const d = await r.json(); if (r.ok) setRows(d.conversations); else setError(d.error); }).finally(() => setLoading(false)); }, []);
  return <div className="mx-auto max-w-4xl space-y-6"><div><h1 className="text-3xl font-bold">Messages</h1><p className="text-muted-foreground">Private work conversations become available after an application is shortlisted or accepted.</p></div>{error && <p role="alert" className="text-destructive">{error}</p>}{loading ? <p>Loading conversations…</p> : rows.length ? <Card><CardContent className="divide-y p-0">{rows.map((row: any) => <Link key={row.id} href={`/messages/${row.id}`} className="flex items-center gap-3 p-4 transition hover:bg-accent"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10"><MessageSquare className="h-5 w-5 text-primary" /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate font-semibold">{row.other_name}</p><time className="shrink-0 text-xs text-muted-foreground">{new Date(row.last_message_at).toLocaleDateString("en-NG")}</time></div><p className="truncate text-sm">{row.opportunity?.title}</p><p className="truncate text-xs text-muted-foreground">{row.last_message}</p></div>{row.unread_count > 0 && <Badge>{row.unread_count}</Badge>}</Link>)}</CardContent></Card> : <Card><CardContent className="py-16 text-center"><MessageSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="font-semibold">No private conversations yet</p><p className="text-sm text-muted-foreground">Shortlisted and accepted applications will appear here.</p></CardContent></Card>}</div>;
}
