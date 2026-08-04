"use client";
import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Bookmark, Clock, MapPin, Pencil, Users } from "lucide-react";
import { ProjectControls } from "@/components/opportunities/project-controls";
import { CommunityReportDialog } from "@/components/opportunities/report-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatBudget } from "@/lib/job-opportunities";
import type { JobOpportunity } from "@/types/job-opportunity";

export default function OpportunityDetailsPage() {
  const id = useParams<{ id: string }>().id,
    router = useRouter();
  const [opportunity, setOpportunity] = React.useState<JobOpportunity | null>(
      null,
    ),
    [myApplication, setMyApplication] = React.useState<any>(null),
    [loading, setLoading] = React.useState(true),
    [message, setMessage] = React.useState("");
  const load = React.useCallback(async () => {
    const response = await fetch(`/api/opportunities/${id}`);
    const data = await response.json();
    if (response.ok) {
      setOpportunity(data.opportunity);
      setMyApplication(data.myApplication);
    } else setMessage(data.error);
    setLoading(false);
  }, [id]);
  React.useEffect(() => {
    load();
  }, [load]);
  const action = async (name: string) => {
    const response = await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: name }),
    });
    const data = await response.json();
    if (response.ok) {
      if (data.reviewUrl) window.location.href = data.reviewUrl;
      else load();
    } else setMessage(data.error);
  };
  const cancel = async () => {
    if (
      !window.confirm(
        "Cancel this job request? Existing history will be preserved.",
      )
    )
      return;
    const response = await fetch(`/api/opportunities/${id}`, {
      method: "DELETE",
    });
    if (response.ok) router.push("/opportunities/my-posts");
    else setMessage((await response.json()).error);
  };
  const save = async () => {
    if (!opportunity) return;
    const response = await fetch(`/api/opportunities/${id}/save`, {
      method: opportunity.is_saved ? "DELETE" : "POST",
    });
    if (response.ok)
      setOpportunity({ ...opportunity, is_saved: !opportunity.is_saved });
  };
  if (loading)
    return <Skeleton className="mx-auto h-[600px] max-w-5xl rounded-xl" />;
  if (!opportunity)
    return (
      <Card>
        <CardContent className="py-16 text-center">
          {message || "Opportunity not found."}
        </CardContent>
      </Card>
    );
  const accepting = ["approved", "awaiting_assignment"].includes(
    opportunity.status,
  );
  const project = [
    "assigned",
    "in_progress",
    "ready_for_review",
    "revision_requested",
    "completed",
    "cancelled",
  ].includes(opportunity.status);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {message && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          {message}
        </p>
      )}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{opportunity.category}</Badge>
            <Badge variant="outline" className="capitalize">
              {opportunity.status.replaceAll("_", " ")}
            </Badge>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">{opportunity.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Posted by {opportunity.poster_name} on{" "}
                {new Date(opportunity.created_at).toLocaleDateString("en-NG")}
              </p>
            </div>
            {opportunity.is_owner ? (
              <OwnerActions
                opportunity={opportunity}
                action={action}
                cancel={cancel}
              />
            ) : (
              <div className="flex gap-2">
                {accepting && (
                  <Button variant="outline" onClick={save}>
                    <Bookmark
                      className={`mr-2 h-4 w-4 ${opportunity.is_saved ? "fill-current" : ""}`}
                    />
                    {opportunity.is_saved ? "Saved" : "Save"}
                  </Button>
                )}
                {!myApplication && accepting && (
                  <ApplyDialog opportunity={opportunity} onApplied={load} />
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Fact
              icon={MapPin}
              text={
                opportunity.work_location_type === "remote"
                  ? "Remote"
                  : [opportunity.city, opportunity.country_code]
                      .filter(Boolean)
                      .join(", ")
              }
            />
            <Fact icon={Clock} text={opportunity.delivery_time} />
            <Fact
              icon={Users}
              text={`${opportunity.application_count || 0} applicants`}
            />
            <Fact text={formatBudget(opportunity)} />
          </div>
          <section>
            <h2 className="mb-2 text-lg font-semibold">About the work</h2>
            <p className="whitespace-pre-wrap text-sm leading-7">
              {opportunity.description}
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold">Required skills</h2>
            <div className="flex flex-wrap gap-2">
              {opportunity.skills.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </section>
          {opportunity.application_questions.length > 0 && (
            <section>
              <h2 className="mb-2 text-lg font-semibold">
                Application questions
              </h2>
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                {opportunity.application_questions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ol>
            </section>
          )}
          {myApplication && (
            <p className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
              Your application is{" "}
              <strong className="capitalize">{myApplication.status}</strong>.{" "}
              <Link
                className="text-primary underline"
                href="/opportunities/my-applications"
              >
                View application
              </Link>
            </p>
          )}
          {!opportunity.is_owner && (
            <CommunityReportDialog
              entityType="opportunity"
              entityId={opportunity.id}
            />
          )}
        </CardContent>
      </Card>
      {project && <ProjectControls opportunityId={opportunity.id} />}
    </div>
  );
}
function Fact({
  icon: Icon,
  text,
}: {
  icon?: React.ElementType;
  text: string;
}) {
  return (
    <span className="flex items-center gap-2 text-sm">
      {Icon && <Icon className="h-4 w-4 text-primary" />}
      {text}
    </span>
  );
}
function OwnerActions({
  opportunity,
  action,
  cancel,
}: {
  opportunity: JobOpportunity;
  action: (name: string) => void;
  cancel: () => void;
}) {
  const editable = ["pending_review", "changes_requested"].includes(
    opportunity.status,
  );
  return (
    <div className="flex flex-wrap gap-2">
      {editable && (
        <Button variant="outline" asChild>
          <Link href={`/opportunities/${opportunity.id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit and resubmit
          </Link>
        </Button>
      )}
      <Button variant="outline" asChild>
        <Link href={`/opportunities/${opportunity.id}/applications`}>
          Applicants
        </Link>
      </Button>
      {opportunity.status === "completed" && (
        <Button onClick={() => action("review_request")}>
          Review freelancer
        </Button>
      )}
      {[
        "pending_review",
        "changes_requested",
        "approved",
        "awaiting_assignment",
      ].includes(opportunity.status) && (
        <Button variant="destructive" onClick={cancel}>
          Cancel request
        </Button>
      )}
    </div>
  );
}
function ApplyDialog({
  opportunity,
  onApplied,
}: {
  opportunity: JobOpportunity;
  onApplied: () => void;
}) {
  const [open, setOpen] = React.useState(false),
    [message, setMessage] = React.useState(""),
    [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState({
    proposal: "",
    relevantExperience: "",
    estimatedDelivery: "",
    proposedBudget: "",
    answers: opportunity.application_questions.map(() => ""),
    portfolioLinks: "",
  });
  const submit = async () => {
    setBusy(true);
    const response = await fetch(
      `/api/opportunities/${opportunity.id}/applications`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          portfolioLinks: form.portfolioLinks.split("\n").filter(Boolean),
        }),
      },
    );
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(data.error);
    setOpen(false);
    onApplied();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Apply now</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Apply to {opportunity.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Short proposal">
            <Textarea
              minLength={30}
              value={form.proposal}
              onChange={(event) =>
                setForm({ ...form, proposal: event.target.value })
              }
            />
          </Field>
          <Field label="Relevant experience">
            <Textarea
              value={form.relevantExperience}
              onChange={(event) =>
                setForm({ ...form, relevantExperience: event.target.value })
              }
            />
          </Field>
          <Field label="Estimated delivery">
            <Input
              value={form.estimatedDelivery}
              onChange={(event) =>
                setForm({ ...form, estimatedDelivery: event.target.value })
              }
            />
          </Field>
          <Field label="Proposed budget">
            <Input
              type="number"
              min="0"
              value={form.proposedBudget}
              onChange={(event) =>
                setForm({ ...form, proposedBudget: event.target.value })
              }
            />
          </Field>
          {opportunity.application_questions.map((question, index) => (
            <Field key={question} label={question}>
              <Textarea
                value={form.answers[index]}
                onChange={(event) => {
                  const answers = [...form.answers];
                  answers[index] = event.target.value;
                  setForm({ ...form, answers });
                }}
              />
            </Field>
          ))}
          <Field label="Portfolio links (one per line)">
            <Textarea
              value={form.portfolioLinks}
              onChange={(event) =>
                setForm({ ...form, portfolioLinks: event.target.value })
              }
            />
          </Field>
          {message && (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}
          <Button disabled={busy} onClick={submit}>
            {busy ? "Submitting…" : "Submit application"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
