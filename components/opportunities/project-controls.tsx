"use client";
import * as React from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { VerificationBadge } from "@/components/freelancer/verification-badge";
import { CommunityReportDialog } from "@/components/opportunities/report-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function ProjectControls({ opportunityId }: { opportunityId: string }) {
  const [data, setData] = React.useState<any>(null),
    [error, setError] = React.useState(""),
    [reason, setReason] = React.useState("");
  const load = React.useCallback(
    () =>
      fetch(`/api/opportunities/${opportunityId}/project`)
        .then(async (response) => {
          const next = await response.json();
          if (!response.ok) throw new Error(next.error);
          setData(next);
        })
        .catch((cause) => setError(cause.message)),
    [opportunityId],
  );
  React.useEffect(() => {
    load();
  }, [load]);
  const action = async (name: string) => {
    if (
      ["request_revision", "cancel", "confirm_completion"].includes(name) &&
      !window.confirm(`Confirm ${name.replaceAll("_", " ")}?`)
    )
      return;
    const response = await fetch(
      `/api/opportunities/${opportunityId}/project`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: name, reason }),
      },
    );
    const next = await response.json();
    if (!response.ok) setError(next.error);
    else {
      setReason("");
      load();
    }
  };
  if (!data)
    return error ? null : (
      <p className="text-sm text-muted-foreground">Loading project controls…</p>
    );
  const status = data.opportunity.status;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Managed project</CardTitle>
          <Badge className="capitalize">{status.replaceAll("_", " ")}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 text-sm">
          {data.participants.map((person: any) => (
            <span
              key={person.user_id}
              className="inline-flex items-center gap-1 capitalize"
            >
              {person.display_name} ({person.participant_role})
              {person.is_verified && <VerificationBadge className="scale-75" />}
            </span>
          ))}
        </div>
        {data.conversation && (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/messages/${data.conversation.id}`}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Open project conversation
              </Link>
            </Button>
            {data.role !== "owner" && (
              <CommunityReportDialog
                entityType="conversation"
                entityId={data.conversation.id}
              />
            )}
          </div>
        )}
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason for revision, cancellation or update request"
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {data.role === "freelancer" &&
            data.assignment.status === "offered" && (
              <Button onClick={() => action("accept_assignment")}>
                Accept assignment
              </Button>
            )}
          {data.role === "freelancer" &&
            data.assignment.status === "accepted" &&
            status === "assigned" && (
              <Button onClick={() => action("start_work")}>Start work</Button>
            )}
          {data.role === "freelancer" &&
            ["in_progress", "revision_requested"].includes(status) && (
              <Button
                onClick={() =>
                  action(
                    status === "revision_requested"
                      ? "respond_revision"
                      : "ready_for_review",
                  )
                }
              >
                {status === "revision_requested"
                  ? "Resume revisions"
                  : "Mark ready for review"}
              </Button>
            )}
          {data.role === "client" && status === "ready_for_review" && (
            <>
              <Button onClick={() => action("confirm_completion")}>
                Confirm completion
              </Button>
              <Button
                variant="outline"
                onClick={() => action("request_revision")}
              >
                Request revisions
              </Button>
            </>
          )}
          {data.role === "owner" && (
            <>
              <Button
                variant="outline"
                onClick={() => action("request_update")}
              >
                Request update
              </Button>
              {status === "assigned" && (
                <Button onClick={() => action("start_work")}>
                  Mark in progress
                </Button>
              )}
              {["in_progress", "revision_requested"].includes(status) && (
                <Button onClick={() => action("ready_for_review")}>
                  Ready for client review
                </Button>
              )}
              {status === "ready_for_review" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => action("request_revision")}
                  >
                    Request corrections
                  </Button>
                  <Button onClick={() => action("complete")}>Complete</Button>
                </>
              )}{" "}
              {!["completed", "cancelled"].includes(status) && (
                <Button variant="destructive" onClick={() => action("cancel")}>
                  Cancel project
                </Button>
              )}
            </>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold">Status history</h3>
          <div className="mt-2 space-y-2">
            {data.events.map((event: any) => (
              <div
                key={event.id}
                className="border-l-2 border-primary/40 pl-3 text-sm"
              >
                <span className="capitalize">
                  {event.new_status.replaceAll("_", " ")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {" "}
                  · {new Date(event.created_at).toLocaleString("en-NG")}
                </span>
                {event.reason && (
                  <p className="text-xs text-muted-foreground">
                    {event.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
