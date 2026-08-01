"use client";
import * as React from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
export function VerificationApplication() {
  const [status, setStatus] = React.useState("not_verified");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  React.useEffect(() => {
    fetch("/api/verification")
      .then((r) => r.json())
      .then((d) => setStatus(d.status || "not_verified"));
  }, []);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/verification", {
      method: "POST",
      body: new FormData(e.currentTarget),
    });
    const data = await response.json();
    setMessage(
      response.ok ? "Verification application submitted securely." : data.error,
    );
    if (response.ok) setStatus("pending");
    setBusy(false);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          LeadPilot freelancer verification{" "}
          <Badge variant="secondary" className="capitalize">
            {status.replaceAll("_", " ")}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-5 text-sm text-muted-foreground">
          Verification is reviewed manually by an authorised LeadPilot AI
          administrator. It is not granted automatically and does not guarantee
          work quality.
        </p>
        {["pending", "verified"].includes(status) ? (
          <p className="rounded-lg bg-primary/10 p-4 text-sm">
            {status === "verified"
              ? "Your professional information has been reviewed."
              : "Your application is awaiting authorised review."}
          </p>
        ) : (
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Legal name</Label>
              <Input name="legalName" required />
            </div>
            <div>
              <Label>Country</Label>
              <Input name="country" required />
            </div>
            <div>
              <Label>Phone number</Label>
              <Input name="phoneNumber" required />
            </div>
            <div>
              <Label>Email address</Label>
              <Input name="emailAddress" type="email" required />
            </div>
            <div>
              <Label>Document type</Label>
              <Input
                name="documentType"
                placeholder="Passport, national ID…"
                required
              />
            </div>
            <div>
              <Label>LinkedIn/professional URL</Label>
              <Input name="linkedinUrl" type="url" />
            </div>
            <div>
              <Label>Government-issued document</Label>
              <Input
                name="document"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                required
              />
              <p className="text-xs text-muted-foreground">
                Private, maximum 10 MB.
              </p>
            </div>
            <div>
              <Label>Selfie or identity photo</Label>
              <Input
                name="selfie"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
              />
              <p className="text-xs text-muted-foreground">
                Private, maximum 10 MB.
              </p>
            </div>
            <div className="sm:col-span-2">
              <Label>Evidence of professional work</Label>
              <Textarea
                name="professionalEvidence"
                rows={4}
                placeholder="Describe projects, clients, credentials or links that support your application."
                required
              />
            </div>
            {message && <p className="sm:col-span-2 text-sm">{message}</p>}
            <Button className="sm:col-span-2" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit
              securely for review
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
