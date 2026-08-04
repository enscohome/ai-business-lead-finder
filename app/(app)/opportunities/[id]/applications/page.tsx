"use client";
import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Star } from "lucide-react";
import { VerificationBadge } from "@/components/freelancer/verification-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ApplicantsPage() {
  const id = useParams<{ id: string }>().id;
  const [rows, setRows] = React.useState<any[]>([]),
    [title, setTitle] = React.useState("Applicants"),
    [message, setMessage] = React.useState("");
  const load = React.useCallback(
    () =>
      fetch(`/api/opportunities/${id}/applications`).then(async (response) => {
        const data = await response.json();
        if (response.ok) {
          setRows(data.applications);
          setTitle(`Applicants for ${data.opportunity.title}`);
        } else setMessage(data.error);
      }),
    [id],
  );
  React.useEffect(() => {
    load();
  }, [load]);
  const decide = async (application: any, status: string) => {
    const response = await fetch(
      `/api/opportunities/applications/${application.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      },
    );
    const data = await response.json();
    if (response.ok) load();
    else setMessage(data.error);
  };
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground">
          Clients may shortlist and message applicants. Final assignment is
          handled securely by LeadPilot.
        </p>
      </div>
      {message && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          {message}
        </p>
      )}
      <div className="space-y-4">
        {rows.map((row) => (
          <Card key={row.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={row.freelancer?.profile_image_url || undefined}
                    />
                    <AvatarFallback>
                      {(row.freelancer?.display_name || "F").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1">
                      <CardTitle className="text-lg">
                        {row.freelancer?.display_name ||
                          row.freelancer?.full_name ||
                          "Freelancer"}
                      </CardTitle>
                      {row.freelancer?.is_verified && <VerificationBadge />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {row.freelancer?.professional_title}
                    </p>
                    <span className="flex items-center gap-1 text-xs">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {row.freelancer?.rating || "New"} (
                      {row.freelancer?.review_count || 0} reviews)
                    </span>
                  </div>
                </div>
                <Badge className="capitalize">{row.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h2 className="font-medium">Proposal</h2>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {row.proposal}
                </p>
              </div>
              <div>
                <h2 className="font-medium">Relevant experience</h2>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {row.relevant_experience}
                </p>
              </div>
              {row.answers?.length > 0 && (
                <div>
                  <h2 className="font-medium">Answers</h2>
                  <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                    {row.answers.map((answer: string, index: number) => (
                      <li key={index}>{answer}</li>
                    ))}
                  </ol>
                </div>
              )}
              <p className="text-sm">
                Delivery: {row.estimated_delivery} · proposed budget:{" "}
                {row.proposed_budget ?? "not specified"}
              </p>
              {row.freelancer?.skills?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {row.freelancer.skills.map((skill: string) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {row.freelancer?.username && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/freelancer/${row.freelancer.username}`}>
                      View profile
                    </Link>
                  </Button>
                )}
                {["submitted", "shortlisted"].includes(row.status) && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => decide(row, "shortlisted")}
                    >
                      Shortlist
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => decide(row, "rejected")}
                    >
                      Reject
                    </Button>
                  </>
                )}
                {row.conversation_id && (
                  <Button asChild size="sm">
                    <Link href={`/messages/${row.conversation_id}`}>
                      Message freelancer
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {!rows.length && !message && (
        <p className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          No applications yet.
        </p>
      )}
    </div>
  );
}
