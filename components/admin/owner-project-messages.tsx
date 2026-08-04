"use client";
import * as React from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { VerificationBadge } from "@/components/freelancer/verification-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function OwnerProjectMessages() {
  const [rows, setRows] = React.useState<any[]>([]),
    [query, setQuery] = React.useState(""),
    [status, setStatus] = React.useState("all"),
    [error, setError] = React.useState("");
  React.useEffect(() => {
    fetch("/api/opportunities/conversations")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setRows(
          (data.conversations || []).filter((row: any) => row.role === "owner"),
        );
      })
      .catch((reason) => setError(reason.message));
  }, []);
  const filtered = rows.filter(
    (row) =>
      (status === "all" || row.opportunity?.status === status) &&
      (!query ||
        `${row.opportunity?.title} ${row.other_name}`
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Project messages</h1>
        <p className="text-muted-foreground">
          Only managed project rooms where this account is an explicit
          participant are shown.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <Input
          placeholder="Search job, client or freelancer"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All project statuses</SelectItem>
            {[
              "assigned",
              "in_progress",
              "ready_for_review",
              "revision_requested",
              "completed",
              "cancelled",
            ].map((item) => (
              <SelectItem key={item} value={item}>
                {item.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {filtered.length ? (
        filtered.map((row) => (
          <Card key={row.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{row.opportunity?.title}</p>
                  <Badge variant="outline" className="capitalize">
                    {row.opportunity?.status?.replaceAll("_", " ")}
                  </Badge>
                  {row.unread_count > 0 && (
                    <Badge>{row.unread_count} unread</Badge>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                  {row.participants
                    .filter(
                      (person: any) => person.participant_role !== "owner",
                    )
                    .map((person: any, index: number) => (
                      <React.Fragment key={person.user_id}>
                        {index > 0 && <span>·</span>}
                        <span>{person.display_name}</span>
                        {person.is_verified && (
                          <VerificationBadge className="scale-75" />
                        )}
                      </React.Fragment>
                    ))}
                </div>
                <p className="mt-2 truncate text-sm">{row.last_message}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(row.last_message_at).toLocaleString("en-NG")}
                  {row.unread_count > 0 ? " · Action required" : " · Read"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm">
                  <Link href={`/messages/${row.id}`}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Open
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/opportunities/${row.opportunity_id}`}>
                    Job
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No managed project conversations match this filter.
        </p>
      )}
    </div>
  );
}
