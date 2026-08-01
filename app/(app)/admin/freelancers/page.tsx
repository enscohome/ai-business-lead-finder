"use client";
import * as React from "react";
import Link from "next/link";
import { FileSearch, Loader2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function FreelancerAdminPage() {
  const [data, setData] = React.useState<any>(null);
  const [message, setMessage] = React.useState("");
  const load = React.useCallback(
    () =>
      fetch("/api/admin/freelancers")
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error);
          setData(d);
        })
        .catch((e) => setMessage(e.message)),
    [],
  );
  React.useEffect(() => {
    load();
  }, [load]);
  const act = async (body: any) => {
    const r = await fetch("/api/admin/freelancers", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    setMessage(r.ok ? "Moderation action completed." : d.error);
    if (r.ok) load();
  };
  if (!data && !message)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  if (!data)
    return (
      <div className="rounded-lg bg-red-500/10 p-5 text-red-700">{message}</div>
    );
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="h-6 w-6" />
          Freelancer Administration
        </h1>
        <p className="text-muted-foreground">
          Verification and review decisions are restricted to authorised
          LeadPilot AI administrators.
        </p>
      </div>
      {message && <p className="rounded-lg bg-muted p-3 text-sm">{message}</p>}
      <Tabs defaultValue="verification">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="reviews">Review moderation</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
        </TabsList>
        <TabsContent value="verification" className="space-y-3">
          {data.applications.map((item: any) => (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{item.legal_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.country} · submitted{" "}
                    {new Date(item.submitted_at).toLocaleDateString("en-NG")}
                  </p>
                  <Badge className="mt-2 capitalize" variant="secondary">
                    {item.application_status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a
                      href={`/api/admin/verification-document?applicationId=${item.id}&kind=document`}
                      target="_blank"
                    >
                      <FileSearch className="mr-2 h-4 w-4" />
                      ID document
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <a
                      href={`/api/admin/verification-document?applicationId=${item.id}&kind=selfie`}
                      target="_blank"
                    >
                      Selfie
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      act({
                        type: "verification",
                        status: "verified",
                        freelancerId: item.freelancer_id,
                        applicationId: item.id,
                      })
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      act({
                        type: "verification",
                        status: "rejected",
                        freelancerId: item.freelancer_id,
                        applicationId: item.id,
                        reason:
                          "Application did not meet verification requirements.",
                      })
                    }
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      act({
                        type: "verification",
                        status: "suspended",
                        freelancerId: item.freelancer_id,
                        applicationId: item.id,
                      })
                    }
                  >
                    Suspend
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="reviews" className="space-y-3">
          {data.reviews.map((review: any) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold">
                      {review.client_name} · {review.rating}/5
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {review.project_title}
                    </p>
                  </div>
                  <Badge className="capitalize">
                    {review.moderation_status}
                  </Badge>
                </div>
                <p className="my-3 text-sm">{review.review_text}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      act({
                        type: "review",
                        status: "approved",
                        reviewId: review.id,
                      })
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      act({
                        type: "review",
                        status: "hidden",
                        reviewId: review.id,
                      })
                    }
                  >
                    Hide
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      act({
                        type: "review",
                        status: "removed",
                        reviewId: review.id,
                      })
                    }
                  >
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="reports" className="space-y-3">
          {data.reports.map((report: any) => (
            <Card key={report.id}>
              <CardContent className="p-4">
                <p className="font-semibold capitalize">
                  {report.reason.replaceAll("_", " ")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {report.details || "No additional details."}
                </p>
                <Badge className="mt-2 capitalize" variant="secondary">
                  {report.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="profiles">
          <div className="grid gap-3 sm:grid-cols-2">
            {data.profiles.map((profile: any) => (
              <Card key={profile.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">
                        {profile.display_name || profile.full_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        @{profile.username} · {profile.professional_title}
                      </p>
                    </div>
                    <Badge className="capitalize">
                      {profile.verification_status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/freelancer/${profile.username}`}
                        target="_blank"
                      >
                        View profile
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        act({
                          type: "suspend_profile",
                          freelancerId: profile.id,
                          userId: profile.user_id,
                        })
                      }
                    >
                      Suspend profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
