"use client";
import * as React from "react";
import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { VerificationBadge } from "@/components/freelancer/verification-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function VerificationApplication() {
  const [result, setResult] = React.useState<any>({
    status: "not_applied",
    application: null,
  });
  const [busy, setBusy] = React.useState(false),
    [message, setMessage] = React.useState(""),
    [loading, setLoading] = React.useState(true);
  const load = React.useCallback(
    () =>
      fetch("/api/verification")
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          setResult(data);
        })
        .catch((error) => setMessage(error.message))
        .finally(() => setLoading(false)),
    [],
  );
  React.useEffect(() => {
    load();
  }, [load]);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/verification", {
      method: "POST",
      body: new FormData(event.currentTarget),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(data.error);
    setMessage(
      result.status === "changes_requested"
        ? "Application updated and resubmitted."
        : "Verification application submitted securely.",
    );
    load();
  };
  if (loading)
    return (
      <p className="text-sm text-muted-foreground">
        Loading verification status…
      </p>
    );
  const status = result.status || "not_applied";
  const application = result.application;
  const locked = [
    "pending",
    "under_review",
    "approved",
    "rejected",
    "revoked",
  ].includes(status);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-500" />
          LeadPilot Verified{" "}
          <Badge variant="secondary" className="capitalize">
            {status.replaceAll("_", " ")}
          </Badge>
          {result.isVerified && <VerificationBadge />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-sm">
          <p className="font-medium">Manual professional review</p>
          <p className="mt-1 text-muted-foreground">
            LeadPilot Verified means identity or professional information was
            reviewed by LeadPilot AI. It is not a guarantee of work quality and
            cannot be purchased.
          </p>
        </div>
        {result.isOwner ? (
          <p className="rounded-lg bg-primary/10 p-4 text-sm">
            The permanent LeadPilot owner role is automatically verified. No
            application or subscription is required.
          </p>
        ) : locked ? (
          <Status application={application} status={status} />
        ) : (
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Full legal or professional name</Label>
              <Input
                name="professionalName"
                defaultValue={application?.professional_name || ""}
                required
                minLength={2}
                maxLength={160}
              />
            </div>
            <div>
              <Label>Professional category</Label>
              <Input
                name="professionalCategory"
                defaultValue={application?.professional_category || ""}
                required
                maxLength={120}
              />
            </div>
            <div>
              <Label>Years of experience</Label>
              <Input
                name="yearsExperience"
                type="number"
                min="0"
                max="80"
                defaultValue={application?.years_experience ?? ""}
                required
              />
            </div>
            <div>
              <Label>Main skills</Label>
              <Input
                name="mainSkills"
                defaultValue={(application?.main_skills || []).join(", ")}
                placeholder="Website design, automation, SEO"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Why are you requesting verification?</Label>
              <Textarea
                name="reason"
                minLength={20}
                maxLength={3000}
                required
              />
            </div>
            <div>
              <Label>Portfolio links</Label>
              <Textarea
                name="portfolioLinks"
                defaultValue={(application?.portfolio_links || []).join("\n")}
                placeholder="One safe HTTPS URL per line"
              />
            </div>
            <div>
              <Label>Social or professional links</Label>
              <Textarea
                name="professionalLinks"
                defaultValue={(application?.professional_links || []).join(
                  "\n",
                )}
                placeholder="LinkedIn, GitHub or professional profile URLs"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Optional private supporting documents</Label>
              <Input
                name="documents"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
              />
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <LockKeyhole className="h-3 w-3" />
                Private storage, safe file types only, maximum 10 MB each. Only
                authorised reviewers receive short-lived access.
              </p>
            </div>
            <div className="sm:col-span-2">
              <Label>Additional explanation</Label>
              <Textarea
                name="additionalInformation"
                maxLength={5000}
                defaultValue={application?.additional_information || ""}
              />
            </div>
            {status === "changes_requested" && (
              <p className="sm:col-span-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-600">
                Requested changes: {application?.change_request_reason}
              </p>
            )}
            {message && (
              <p role="alert" className="sm:col-span-2 text-sm">
                {message}
              </p>
            )}
            <Button className="sm:col-span-2" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {status === "changes_requested"
                ? "Update and resubmit"
                : "Submit for manual review"}
            </Button>
          </form>
        )}
        {message && locked && (
          <p role="alert" className="text-sm">
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Status({ application, status }: { application: any; status: string }) {
  const text: Record<string, string> = {
    pending: "Your application is waiting for an authorised reviewer.",
    under_review:
      "An authorised LeadPilot reviewer is reviewing your application.",
    approved:
      "Your professional information has been reviewed and the badge is active.",
    rejected: `Your application was rejected.${application?.rejection_reason ? ` Reason: ${application.rejection_reason}` : ""}`,
    revoked:
      "Your LeadPilot Verified badge has been revoked. Contact support if you believe this was an error.",
  };
  return (
    <div className="rounded-lg bg-muted/50 p-4 text-sm">
      <p>{text[status] || "Verification status updated."}</p>
      {application?.reviewed_at && (
        <p className="mt-2 text-xs text-muted-foreground">
          Reviewed {new Date(application.reviewed_at).toLocaleString("en-NG")}
        </p>
      )}
    </div>
  );
}
