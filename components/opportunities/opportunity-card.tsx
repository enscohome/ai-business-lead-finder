"use client";
import * as React from "react";
import Link from "next/link";
import { Bookmark, BriefcaseBusiness, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBudget } from "@/lib/job-opportunities";
import type { JobOpportunity } from "@/types/job-opportunity";

export function OpportunityCard({ opportunity, onSaved }: { opportunity: JobOpportunity; onSaved?: (saved: boolean) => void }) {
  const [saved, setSaved] = React.useState(Boolean(opportunity.is_saved));
  const [busy, setBusy] = React.useState(false);
  const save = async () => {
    setBusy(true);
    const response = await fetch(`/api/opportunities/${opportunity.id}/save`, { method: saved ? "DELETE" : "POST" });
    if (response.ok) { setSaved(!saved); onSaved?.(!saved); }
    setBusy(false);
  };
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="secondary">{opportunity.category}</Badge>
          {opportunity.status !== "open" && <Badge variant="outline" className="capitalize">{opportunity.status.replace("_", " ")}</Badge>}
        </div>
        <CardTitle className="text-lg leading-snug"><Link className="hover:text-primary" href={`/opportunities/${opportunity.id}`}>{opportunity.title}</Link></CardTitle>
        <p className="line-clamp-3 text-sm text-muted-foreground">{opportunity.description}</p>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="flex flex-wrap gap-2">{opportunity.skills.slice(0, 5).map((skill) => <Badge key={skill} variant="outline">{skill}</Badge>)}</div>
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{opportunity.work_location_type === "remote" ? "Remote" : [opportunity.city, opportunity.country_code].filter(Boolean).join(", ")}</span>
          <span className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4" />{formatBudget(opportunity)}</span>
          <span className="flex items-center gap-2"><Users className="h-4 w-4" />{opportunity.application_count || 0} applications</span>
          <span>{new Date(opportunity.created_at).toLocaleDateString("en-NG")}</span>
        </div>
        <p className="text-xs text-muted-foreground">Posted by {opportunity.poster_name || "LeadPilot member"}</p>
      </CardContent>
      <CardFooter className="gap-2">
        {opportunity.status === "open" && <Button variant="outline" size="icon" aria-label={saved ? "Remove saved opportunity" : "Save opportunity"} disabled={busy} onClick={save}><Bookmark className={`h-4 w-4 ${saved ? "fill-current text-primary" : ""}`} /></Button>}
        <Button asChild className="flex-1"><Link href={`/opportunities/${opportunity.id}`}>View opportunity</Link></Button>
      </CardFooter>
    </Card>
  );
}
