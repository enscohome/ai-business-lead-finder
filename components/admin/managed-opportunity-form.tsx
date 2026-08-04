"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  OpportunityForm,
  type OpportunityFormValue,
} from "@/components/opportunities/opportunity-form";
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

export function ManagedOpportunityForm() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [users, setUsers] = React.useState<any[]>([]);
  const [clientUserId, setClientUserId] = React.useState("");
  const [managedClientName, setManagedClientName] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [initialStatus, setInitialStatus] = React.useState("pending_review");
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    const timeout = window.setTimeout(
      () =>
        fetch(
          `/api/admin/control-centre/opportunities?q=${encodeURIComponent(query)}`,
        )
          .then((response) => response.json())
          .then((data) => setUsers(data.users || []))
          .catch(() => setUsers([])),
      200,
    );
    return () => window.clearTimeout(timeout);
  }, [query]);
  const submit = async (value: OpportunityFormValue) => {
    setError("");
    const response = await fetch("/api/admin/control-centre/opportunities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...value,
        clientUserId: clientUserId || null,
        managedClientName: clientUserId ? "" : managedClientName,
        privateOwnerNotes: notes,
        initialStatus,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error);
      return;
    }
    router.push(`/admin/opportunities/${data.opportunity.id}`);
  };
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Post a job for a client</h1>
        <p className="text-muted-foreground">
          Create a managed request without exposing private client contact
          details.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Client and moderation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Search LeadPilot users</Label>
            <Input
              placeholder="Name or email"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Existing client</Label>
            <Select
              value={clientUserId || "manual"}
              onValueChange={(value) =>
                setClientUserId(value === "manual" ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manually managed client</SelectItem>
                {users
                  .filter((user) => !user.is_suspended)
                  .map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} · {user.email}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {!clientUserId && (
            <div className="sm:col-span-2">
              <Label>Managed client name</Label>
              <Input
                required
                value={managedClientName}
                onChange={(event) => setManagedClientName(event.target.value)}
              />
            </div>
          )}
          <div className="sm:col-span-2">
            <Label>Private owner notes</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Visible only inside authorised control routes"
            />
          </div>
          <div>
            <Label>Initial status</Label>
            <Select value={initialStatus} onValueChange={setInitialStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending_review">Pending review</SelectItem>
                <SelectItem value="approved">Approved immediately</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Job details</CardTitle>
        </CardHeader>
        <CardContent>
          <OpportunityForm submitLabel="Create managed job" onSubmit={submit} />
          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
