"use client";
import * as React from "react";
import Link from "next/link";
import { ExternalLink, FileLock2, ShieldCheck, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function VerificationReviewQueue() {
  const [rows, setRows] = React.useState<any[]>([]),
    [status, setStatus] = React.useState("all"),
    [query, setQuery] = React.useState(""),
    [canDecide, setCanDecide] = React.useState(false),
    [error, setError] = React.useState("");
  const load = React.useCallback(
    () =>
      fetch(
        `/api/admin/control-centre/verifications?status=${encodeURIComponent(status)}&q=${encodeURIComponent(query)}`,
      )
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          setRows(data.applications || []);
          setCanDecide(data.canDecide);
        })
        .catch((reason) => setError(reason.message)),
    [query, status],
  );
  React.useEffect(() => {
    const timeout = window.setTimeout(load, 150);
    return () => window.clearTimeout(timeout);
  }, [load]);
  const decide = async (
    applicationId: string,
    action: string,
    reason: string,
    privateNotes: string,
  ) => {
    if (
      ["approve", "reject", "revoke", "restore"].includes(action) &&
      !window.confirm(`Confirm verification action: ${action}?`)
    )
      return;
    const response = await fetch("/api/admin/control-centre/verifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ applicationId, action, reason, privateNotes }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error);
    else load();
  };
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Verification applications</h1>
        <p className="text-muted-foreground">
          Manual evidence review. Verification is not a guarantee and is never
          linked to payment.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_240px]">
        <Input
          placeholder="Search applicant or category"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {[
              "pending",
              "under_review",
              "changes_requested",
              "approved",
              "rejected",
              "revoked",
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
      {rows.length ? (
        rows.map((application) => (
          <ReviewCard
            key={application.id}
            application={application}
            canDecide={canDecide}
            decide={decide}
          />
        ))
      ) : (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No verification applications match this filter.
        </p>
      )}
    </div>
  );
}

function ReviewCard({
  application,
  canDecide,
  decide,
}: {
  application: any;
  canDecide: boolean;
  decide: (id: string, action: string, reason: string, notes: string) => void;
}) {
  const [reason, setReason] = React.useState(""),
    [notes, setNotes] = React.useState("");
  const performance = application.performance || {};
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-xl">
                {application.profile?.display_name ||
                  application.professional_name}
              </CardTitle>
              <Badge className="capitalize">
                {application.status.replaceAll("_", " ")}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {application.professional_category} ·{" "}
              {application.years_experience} years experience
            </p>
          </div>
          {application.profile?.username && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/freelancer/${application.profile.username}`}>
                Profile <ExternalLink className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Fact
            label="Completed jobs"
            value={performance.completed_jobs || 0}
          />
          <Fact
            label="Rating"
            value={
              <>
                <Star className="mr-1 inline h-3 w-3" />
                {performance.average_rating || 0}
              </>
            }
          />
          <Fact label="Reviews" value={performance.review_count || 0} />
          <Fact label="Reports" value={performance.report_count || 0} />
          <Fact
            label="Suspended"
            value={performance.is_suspended ? "Yes" : "No"}
          />
          <Fact
            label="Account since"
            value={
              performance.account_created_at
                ? new Date(performance.account_created_at).toLocaleDateString(
                    "en-NG",
                  )
                : "Unknown"
            }
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="font-medium">Application</h3>
            <p className="mt-2 text-sm">{application.reason}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {application.main_skills.map((skill: string) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
            {application.additional_information && (
              <p className="mt-3 text-sm text-muted-foreground">
                {application.additional_information}
              </p>
            )}
          </div>
          <div>
            <h3 className="font-medium">Professional evidence</h3>
            <div className="mt-2 space-y-1">
              {[
                ...(application.portfolio_links || []),
                ...(application.professional_links || []),
              ].map((url: string) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-sm text-primary hover:underline"
                >
                  {url}
                </a>
              ))}
            </div>
            {application.document_count > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from(
                  { length: application.document_count },
                  (_, index) => (
                    <Button key={index} asChild size="sm" variant="outline">
                      <a
                        href={`/api/admin/verification-document?applicationId=${application.id}&index=${index}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FileLock2 className="mr-2 h-3 w-3" />
                        Private document {index + 1}
                      </a>
                    </Button>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <Label>Decision reason or applicant instructions</Label>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <div>
            <Label>Private moderator notes</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              decide(application.id, "under_review", reason, notes)
            }
          >
            Start review
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              decide(application.id, "changes_requested", reason, notes)
            }
          >
            Request information
          </Button>
          {canDecide && (
            <Button
              onClick={() => decide(application.id, "approve", reason, notes)}
            >
              Approve
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={() => decide(application.id, "reject", reason, notes)}
          >
            Reject
          </Button>
          {canDecide && (
            <>
              <Button
                variant="destructive"
                onClick={() => decide(application.id, "revoke", reason, notes)}
              >
                Revoke
              </Button>
              <Button
                variant="outline"
                onClick={() => decide(application.id, "restore", reason, notes)}
              >
                Restore
              </Button>
            </>
          )}
        </div>
        {application.history?.length > 0 && (
          <div>
            <h3 className="font-medium">Application history</h3>
            <div className="mt-2 space-y-2">
              {application.history.map((event: any) => (
                <div key={event.id} className="border-l-2 pl-3 text-sm">
                  <span className="capitalize">
                    {event.action.replaceAll("_", " ")}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {new Date(event.created_at).toLocaleString("en-NG")}
                  </span>
                  {event.reason && (
                    <p className="text-muted-foreground">{event.reason}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
