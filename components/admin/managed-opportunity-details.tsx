"use client";
import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  Star,
  UserRoundCheck,
} from "lucide-react";
import { VerificationBadge } from "@/components/freelancer/verification-badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatBudget } from "@/lib/job-opportunities";

export function ManagedOpportunityDetails({ id }: { id: string }) {
  const [data, setData] = React.useState<any>(null),
    [error, setError] = React.useState(""),
    [reason, setReason] = React.useState(""),
    [notes, setNotes] = React.useState(""),
    [formatTitle, setFormatTitle] = React.useState(""),
    [formatDescription, setFormatDescription] = React.useState("");
  const [search, setSearch] = React.useState(""),
    [skill, setSkill] = React.useState("all"),
    [category, setCategory] = React.useState("all"),
    [country, setCountry] = React.useState("all"),
    [verified, setVerified] = React.useState("all"),
    [availability, setAvailability] = React.useState("all"),
    [rating, setRating] = React.useState("0"),
    [completed, setCompleted] = React.useState("0");
  const load = React.useCallback(
    () =>
      fetch(`/api/admin/control-centre/opportunities/${id}`)
        .then(async (response) => {
          const next = await response.json();
          if (!response.ok) throw new Error(next.error);
          setData(next);
          setNotes(next.opportunity.private_owner_notes || "");
          setFormatTitle(next.opportunity.title || "");
          setFormatDescription(next.opportunity.description || "");
        })
        .catch((cause) => setError(cause.message)),
    [id],
  );
  React.useEffect(() => {
    load();
  }, [load]);
  const run = async (action: string, extra: Record<string, unknown> = {}) => {
    if (
      [
        "assign",
        "reject",
        "request_changes",
        "cancel",
        "cancel_assignment",
        "reassign",
      ].includes(action) &&
      !window.confirm(`Confirm ${action.replaceAll("_", " ")}?`)
    )
      return;
    setError("");
    const response = await fetch(
      `/api/admin/control-centre/opportunities/${id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, reason, ...extra }),
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
    return (
      <p className={error ? "text-destructive" : "text-muted-foreground"}>
        {error || "Loading managed job…"}
      </p>
    );
  const job = data.opportunity;
  const filterSkills = Array.from(
    new Set((data.freelancers || []).flatMap((row: any) => row.skills || [])),
  ) as string[];
  const filterCategories = Array.from(
    new Set(
      (data.freelancers || []).flatMap((row: any) =>
        (row.portfolio_projects || [])
          .map((project: any) => project.category)
          .filter(Boolean),
      ),
    ),
  ) as string[];
  const freelancers = (data.freelancers || []).filter((row: any) => {
    const text =
      `${row.display_name} ${row.full_name} ${row.professional_title} ${(row.skills || []).join(" ")}`.toLowerCase();
    return (
      (!search || text.includes(search.toLowerCase())) &&
      (skill === "all" || (row.skills || []).includes(skill)) &&
      (category === "all" ||
        (row.portfolio_projects || []).some(
          (project: any) => project.category === category,
        )) &&
      (country === "all" || row.country === country) &&
      (verified === "all" || String(row.is_verified) === verified) &&
      (availability === "all" || row.availability_status === availability) &&
      row.rating >= Number(rating) &&
      row.completed_jobs >= Number(completed)
    );
  });
  const active = data.assignments.find(
    (row: any) => row.status !== "cancelled",
  );
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Button asChild variant="ghost">
        <Link href="/admin">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Control Centre
        </Link>
      </Button>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">{job.title}</h1>
            <Badge className="capitalize">
              {job.status.replaceAll("_", " ")}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Client: {job.client_name || "Managed client"} · {job.category} ·{" "}
            {formatBudget(job)}
          </p>
        </div>
        {data.conversations[0] && (
          <Button asChild variant="outline">
            <Link href={`/messages/${data.conversations[0].id}`}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Project conversation
            </Link>
          </Button>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Client account summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <span className="text-muted-foreground">Name</span>
            <p className="font-medium">
              {data.clientSummary?.full_name ||
                job.client_name ||
                "Managed client"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Account</span>
            <p className="font-medium">
              {data.clientSummary?.managed
                ? "Manually managed"
                : "LeadPilot user"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Plan</span>
            <p className="font-medium capitalize">
              {data.clientSummary?.plan || "Not applicable"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Status</span>
            <p className="font-medium">
              {data.clientSummary?.is_suspended ? "Suspended" : "Active"}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Review and project controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap text-sm leading-7">
            {job.description}
          </p>
          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Correct obvious formatting
            </summary>
            <div className="mt-3 space-y-3">
              <div>
                <Label>Job title</Label>
                <Input
                  value={formatTitle}
                  onChange={(event) => setFormatTitle(event.target.value)}
                />
              </div>
              <div>
                <Label>Job description</Label>
                <Textarea
                  className="min-h-32"
                  value={formatDescription}
                  onChange={(event) => setFormatDescription(event.target.value)}
                />
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  run("edit_formatting", {
                    title: formatTitle,
                    description: formatDescription,
                  })
                }
              >
                Save formatting correction
              </Button>
            </div>
          </details>
          <div className="flex flex-wrap gap-2">
            {job.skills.map((item: string) => (
              <Badge key={item} variant="secondary">
                {item}
              </Badge>
            ))}
          </div>
          <div>
            <Label>Decision, correction or cancellation reason</Label>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Required for changes, rejection, revision or cancellation"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {job.status === "pending_review" && (
              <>
                <Button onClick={() => run("approve")}>Approve</Button>
                <Button
                  variant="outline"
                  onClick={() => run("request_changes")}
                >
                  Request changes
                </Button>
                <Button variant="destructive" onClick={() => run("reject")}>
                  Reject
                </Button>
              </>
            )}
            {job.status === "approved" && (
              <Button onClick={() => run("open_assignment")}>
                Move to assignment
              </Button>
            )}
            {[
              "assigned",
              "in_progress",
              "ready_for_review",
              "revision_requested",
            ].includes(job.status) && (
              <>
                <Button variant="outline" onClick={() => run("start_work")}>
                  Mark in progress
                </Button>
                <Button
                  variant="outline"
                  onClick={() => run("ready_for_review")}
                >
                  Ready for review
                </Button>
                <Button
                  variant="outline"
                  onClick={() => run("request_revision")}
                >
                  Request corrections
                </Button>
                <Button onClick={() => run("complete")}>
                  Complete project
                </Button>
              </>
            )}{" "}
            {!["completed", "rejected", "cancelled"].includes(job.status) && (
              <Button variant="destructive" onClick={() => run("cancel")}>
                Cancel project
              </Button>
            )}
          </div>
          <div>
            <Label>Private owner notes</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
            <Button
              className="mt-2"
              variant="outline"
              onClick={() => run("notes", { privateOwnerNotes: notes })}
            >
              Save private notes
            </Button>
          </div>
        </CardContent>
      </Card>
      <Tabs defaultValue="assign">
        <TabsList>
          <TabsTrigger value="assign">Assign worker</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
        </TabsList>
        <TabsContent value="assign" className="space-y-4 pt-3">
          {active && (
            <Card className="border-primary/30">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">
                    Active assignment: {active.freelancer_name}
                  </p>
                  <p className="text-sm capitalize text-muted-foreground">
                    {active.status.replaceAll("_", " ")} · assigned{" "}
                    {new Date(active.assigned_at).toLocaleString("en-NG")}
                  </p>
                </div>
                {data.canAssign && (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => run("reassign")}>
                      Reassign
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => run("cancel_assignment")}
                    >
                      Cancel assignment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Input
              placeholder="Search name, title or skill"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select value={skill} onValueChange={setSkill}>
              <SelectTrigger>
                <SelectValue placeholder="Skill" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All required skills</SelectItem>
                {filterSkills.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any portfolio category</SelectItem>
                {filterCategories.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All countries</SelectItem>
                <SelectItem value="Nigeria">Nigeria</SelectItem>
              </SelectContent>
            </Select>
            <Select value={availability} onValueChange={setAvailability}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any availability</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="limited">Limited</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>
            <Select value={verified} onValueChange={setVerified}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any verification</SelectItem>
                <SelectItem value="true">LeadPilot Verified</SelectItem>
                <SelectItem value="false">Not verified</SelectItem>
              </SelectContent>
            </Select>
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Any rating</SelectItem>
                <SelectItem value="4">4+ stars</SelectItem>
                <SelectItem value="4.5">4.5+ stars</SelectItem>
              </SelectContent>
            </Select>
            <Select value={completed} onValueChange={setCompleted}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Any completed-job count</SelectItem>
                <SelectItem value="1">1+ completed jobs</SelectItem>
                <SelectItem value="5">5+ completed jobs</SelectItem>
                <SelectItem value="10">10+ completed jobs</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {freelancers.map((profile: any) => (
              <Card key={profile.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="font-semibold">
                          {profile.display_name || profile.full_name}
                        </p>
                        {profile.is_verified && <VerificationBadge />}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {profile.professional_title}
                      </p>
                    </div>
                    <UserRoundCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(profile.skills || []).slice(0, 6).map((item: string) => (
                      <Badge key={item} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>
                      <Star className="mr-1 inline h-3 w-3" />
                      {profile.rating} ({profile.review_count})
                    </span>
                    <span>{profile.completed_jobs} completed</span>
                    <span>{profile.country || "Location private"}</span>
                    <span className="capitalize">
                      {profile.availability_status || "unknown"}
                    </span>
                    {profile.report_count > 0 && (
                      <span className="text-amber-500">
                        {profile.report_count} active report(s)
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {profile.username && (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/freelancer/${profile.username}`}>
                          Profile
                        </Link>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      disabled={!data.canAssign || Boolean(active)}
                      onClick={() =>
                        run("assign", { freelancerId: profile.user_id })
                      }
                    >
                      Assign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="history" className="grid gap-4 pt-3 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.events.map((event: any) => (
                <div
                  key={event.id}
                  className="border-l-2 border-primary/40 pl-3"
                >
                  <p className="text-sm font-medium capitalize">
                    {event.previous_status
                      ? `${event.previous_status.replaceAll("_", " ")} → `
                      : ""}
                    {event.new_status.replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.reason || "No note"} ·{" "}
                    {new Date(event.created_at).toLocaleString("en-NG")}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assignment history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.assignments.map((row: any) => (
                <div key={row.id} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <p className="font-medium">{row.freelancer_name}</p>
                    <Badge variant="outline" className="capitalize">
                      {row.status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Assigned by {row.assigned_by_name} ·{" "}
                    {new Date(row.assigned_at).toLocaleString("en-NG")}
                  </p>
                  {row.cancellation_reason && (
                    <p className="mt-2 text-sm text-destructive">
                      {row.cancellation_reason}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="applications" className="space-y-2 pt-3">
          {data.applications.length ? (
            data.applications.map((application: any) => (
              <div key={application.id} className="rounded-lg border p-3">
                <Badge variant="outline" className="capitalize">
                  {application.status}
                </Badge>
                <p className="mt-2 text-sm">{application.proposal}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No applications submitted.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
