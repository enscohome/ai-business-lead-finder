"use client";
import * as React from "react";
import Link from "next/link";
import {
  Activity,
  BriefcaseBusiness,
  CheckCircle2,
  CircleAlert,
  MessageSquare,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const cards = [
  ["pending_review", "Pending job requests"],
  ["changes_requested", "Jobs requiring changes"],
  ["approved", "Approved jobs"],
  ["awaiting_assignment", "Waiting for assignment"],
  ["assigned", "Assigned jobs"],
  ["in_progress", "Jobs in progress"],
  ["ready_for_review", "Ready for client review"],
  ["completed", "Completed jobs"],
  ["rejected", "Rejected jobs"],
  ["cancelled", "Cancelled jobs"],
  ["unread_project_messages", "Unread project messages"],
  ["new_freelancer_applications", "New freelancer applications"],
  ["verification_applications", "Verification applications"],
  ["reports_requiring_attention", "Reports requiring attention"],
  ["active_verified_freelancers", "Active verified freelancers"],
  ["suspended_users", "Suspended users"],
] as const;

export function ControlCentreDashboard() {
  const [data, setData] = React.useState<any>(null);
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  React.useEffect(() => {
    fetch("/api/admin/control-centre")
      .then(async (response) => {
        const next = await response.json();
        if (!response.ok) throw new Error(next.error);
        setData(next);
      })
      .catch((reason) => setError(reason.message));
  }, []);
  const moderateUser = async (user: any) => {
    const action = user.is_suspended ? "restore_user" : "suspend_user";
    const reason = user.is_suspended
      ? ""
      : window.prompt("Enter the account suspension reason:")?.trim();
    if (!user.is_suspended && !reason) return;
    if (
      !window.confirm(
        `${user.is_suspended ? "Restore" : "Suspend"} this account?`,
      )
    )
      return;
    const response = await fetch("/api/admin/control-centre", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, userId: user.id, reason }),
    });
    const next = await response.json();
    if (!response.ok) return setError(next.error);
    setData((current: any) => ({
      ...current,
      users: current.users.map((item: any) =>
        item.id === user.id
          ? { ...item, is_suspended: next.is_suspended }
          : item,
      ),
      counts: {
        ...current.counts,
        suspended_users: current.users.filter((item: any) =>
          item.id === user.id ? next.is_suspended : item.is_suspended,
        ).length,
      },
    }));
  };
  if (error)
    return (
      <Card className="mx-auto max-w-3xl">
        <CardContent className="py-12 text-center">
          <CircleAlert className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <p role="alert">{error}</p>
        </CardContent>
      </Card>
    );
  if (!data)
    return (
      <p className="text-sm text-muted-foreground">
        Loading the Owner Control Centre…
      </p>
    );
  const jobs = data.jobs.filter(
    (job: any) =>
      !query ||
      `${job.title} ${job.client_name} ${job.status}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-blue-500" />
            <h1 className="text-3xl font-bold">Owner Control Centre</h1>
          </div>
          <p className="mt-1 text-muted-foreground">
            Secure operational oversight for jobs, projects, freelancers and
            moderation.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Access is derived from <code>app_admins</code>. Current role:{" "}
            <Badge variant="outline" className="capitalize">
              {data.role}
            </Badge>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/admin/opportunities/new">
              <Plus className="mr-2 h-4 w-4" />
              Post managed job
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/messages">
              <MessageSquare className="mr-2 h-4 w-4" />
              Project messages
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/verifications">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Verifications
            </Link>
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([key, label]) => (
          <Card key={key}>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{data.counts[key] || 0}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Tabs defaultValue="overview">
        <TabsList className="h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="jobs">Job requests</TabsTrigger>
          <TabsTrigger value="freelancers">Freelancer directory</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="audit">Administrative activity</TabsTrigger>
        </TabsList>
        <TabsContent
          value="overview"
          className="grid gap-4 pt-3 lg:grid-cols-3"
        >
          <Section title="Assign workers" icon={BriefcaseBusiness}>
            <p>
              Review approved jobs and assign one qualified freelancer through
              the protected assignment workflow.
            </p>
            <Button asChild size="sm" className="mt-4">
              <Link href="/admin?tab=jobs">Review jobs</Link>
            </Button>
          </Section>
          <Section title="Verification applications" icon={CheckCircle2}>
            <p>
              Manually review professional evidence. Verification is never
              purchased or automatic.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-4">
              <Link href="/admin/verifications">Open queue</Link>
            </Button>
          </Section>
          <Section title="Project messages" icon={MessageSquare}>
            <p>
              Only project rooms where this administrative account is an
              explicit participant are available.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-4">
              <Link href="/admin/messages">Open messages</Link>
            </Button>
          </Section>
        </TabsContent>
        <TabsContent value="jobs" className="space-y-3 pt-3">
          <Input
            placeholder="Search job title, client or status"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {jobs.length ? (
            jobs.map((job: any) => (
              <Card key={job.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{job.title}</p>
                      <Badge variant="outline" className="capitalize">
                        {job.status.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {job.client_name || "Managed client"} · {job.category}
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <Link href={`/admin/opportunities/${job.id}`}>
                      {["approved", "awaiting_assignment"].includes(job.status)
                        ? "Assign worker"
                        : "Review"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <Empty text="No jobs match this filter." />
          )}
        </TabsContent>
        <TabsContent
          value="freelancers"
          className="grid gap-3 pt-3 md:grid-cols-2 xl:grid-cols-3"
        >
          {data.freelancers.map((profile: any) => (
            <Card key={profile.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">
                    {profile.display_name || profile.full_name || "Freelancer"}
                  </p>
                  {profile.is_verified && (
                    <ShieldCheck
                      className="h-4 w-4 text-blue-500"
                      aria-label="LeadPilot Verified"
                    />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {profile.professional_title || "Professional profile"}
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {(profile.skills || []).slice(0, 5).map((skill: string) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
                {profile.username && (
                  <Button asChild variant="link" className="mt-2 h-auto p-0">
                    <Link href={`/freelancer/${profile.username}`}>
                      Open public profile
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="reports" className="space-y-3 pt-3">
          {data.reports.length ? (
            data.reports.map((report: any) => (
              <Card key={report.id}>
                <CardContent className="p-4">
                  <Badge className="capitalize">{report.status}</Badge>
                  <p className="mt-2 font-medium capitalize">
                    {report.reason.replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {report.entity_type} ·{" "}
                    {new Date(report.created_at).toLocaleString("en-NG")}
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Empty text="No reports require attention." />
          )}
        </TabsContent>
        <TabsContent value="users" className="space-y-2 pt-3">
          {data.users.map((user: any) => (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <p className="font-medium">
                  {user.full_name || "LeadPilot user"}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user.plan || "free"} plan
                </p>
              </div>
              <div className="flex items-center gap-2">
                {user.is_suspended ? (
                  <Badge variant="destructive">Suspended</Badge>
                ) : (
                  <Badge variant="outline">Active</Badge>
                )}
                <Button
                  size="sm"
                  variant={user.is_suspended ? "outline" : "destructive"}
                  onClick={() => moderateUser(user)}
                >
                  {user.is_suspended ? "Restore" : "Suspend"}
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="audit" className="space-y-2 pt-3">
          {data.events.length ? (
            data.events.map((event: any) => (
              <div key={event.id} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <Badge variant="outline" className="capitalize">
                    {event.new_status.replaceAll("_", " ")}
                  </Badge>
                </div>
                <p className="mt-1 text-sm">
                  {event.reason || "Status updated"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(event.created_at).toLocaleString("en-NG")}
                </p>
              </div>
            ))
          ) : (
            <Empty text="No administrative activity yet." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}
