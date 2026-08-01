"use client";
import * as React from "react";
import {
  Copy,
  Flag,
  Loader2,
  Mail,
  MessageCircle,
  Plus,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { ratingSummary } from "@/lib/freelancer";
import { RatingSummary } from "@/components/freelancer/rating-summary";

export default function ClientReviewsPage() {
  const [requests, setRequests] = React.useState<any[]>([]);
  const [reviews, setReviews] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    clientName: "",
    clientEmail: "",
    projectTitle: "",
  });
  const [createdUrl, setCreatedUrl] = React.useState("");
  const [message, setMessage] = React.useState("");
  const load = React.useCallback(
    () =>
      fetch("/api/review-requests")
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error);
          setRequests(d.requests);
          setReviews(d.reviews);
        })
        .catch((e) => setMessage(e.message))
        .finally(() => setLoading(false)),
    [],
  );
  React.useEffect(() => {
    load();
  }, [load]);
  const create = async () => {
    setMessage("");
    const response = await fetch("/api/review-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error);
    setCreatedUrl(data.reviewUrl);
    load();
  };
  const approved = reviews.filter((r) => r.moderation_status === "approved");
  const summary = ratingSummary(approved.map((r) => r.rating));
  if (loading)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Client Reviews</h1>
          <p className="text-muted-foreground">
            Request genuine feedback and manage your professional reputation.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) setCreatedUrl("");
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Request a Review
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request a client review</DialogTitle>
            </DialogHeader>
            {createdUrl ? (
              <div className="space-y-4">
                <p className="text-sm">
                  Your secure single-use review link expires in 30 days.
                </p>
                <div className="flex gap-2">
                  <Input readOnly value={createdUrl} />
                  <Button
                    size="icon"
                    onClick={() => navigator.clipboard.writeText(createdUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      window.open(
                        `https://wa.me/?text=${encodeURIComponent(`Please review our completed project: ${createdUrl}`)}`,
                      )
                    }
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      (window.location.href = `mailto:${form.clientEmail}?subject=${encodeURIComponent("Review our completed project")}&body=${encodeURIComponent(createdUrl)}`)
                    }
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Client name</Label>
                  <Input
                    value={form.clientName}
                    onChange={(e) =>
                      setForm({ ...form, clientName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Client email (optional)</Label>
                  <Input
                    type="email"
                    value={form.clientEmail}
                    onChange={(e) =>
                      setForm({ ...form, clientEmail: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Completed project/job title</Label>
                  <Input
                    value={form.projectTitle}
                    onChange={(e) =>
                      setForm({ ...form, projectTitle: e.target.value })
                    }
                  />
                </div>
                {message && <p className="text-sm text-red-600">{message}</p>}
                <Button onClick={create}>Generate review link</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      {message && (
        <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700">
          {message}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Rating overview</CardTitle>
          </CardHeader>
          <CardContent>
            <RatingSummary ratings={summary} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Review requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No review requests yet.
              </p>
            ) : (
              requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{request.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {request.project_title} · expires{" "}
                      {new Date(request.expires_at).toLocaleDateString("en-NG")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {request.status === "pending" && new Date(request.expires_at) > new Date() && (
                      <>
                        <Button size="icon" variant="ghost" aria-label="Copy review link" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/review/${request.unique_token}`)}><Copy className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label="Share review link on WhatsApp" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${window.location.origin}/review/${request.unique_token}`)}`)}><MessageCircle className="h-4 w-4" /></Button>
                      </>
                    )}
                    <Badge variant={request.status === "completed" ? "default" : "secondary"} className="capitalize">
                      {request.status === "pending" && new Date(request.expires_at) <= new Date() ? "expired" : request.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Reviews received</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {reviews.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No reviews received yet.
            </p>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{review.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {review.project_title}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">Verified Client Review</Badge>
                    <Badge variant="outline" className="capitalize">
                      {review.moderation_status}
                    </Badge>
                  </div>
                </div>
                <div className="my-2 flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`}
                    />
                  ))}
                </div>
                <p className="text-sm">{review.review_text}</p>
                <ReportButton reviewId={review.id} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReportButton({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("spam");
  const [details, setDetails] = React.useState("");
  const [message, setMessage] = React.useState("");
  const submit = async () => {
    const r = await fetch("/api/reviews/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reviewId, reason, details }),
    });
    const d = await r.json();
    setMessage(r.ok ? "Report submitted for administrator review." : d.error);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="mt-3" size="sm" variant="ghost">
          <Flag className="mr-2 h-3 w-3" />
          Report review
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this review</DialogTitle>
        </DialogHeader>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="abuse">Abuse</SelectItem>
            <SelectItem value="spam">Spam</SelectItem>
            <SelectItem value="false_information">False information</SelectItem>
            <SelectItem value="offensive_language">
              Offensive language
            </SelectItem>
            <SelectItem value="not_real_work">
              Not connected to real work
            </SelectItem>
          </SelectContent>
        </Select>
        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Optional context for the moderation team"
        />
        {message && <p className="text-sm">{message}</p>}
        <Button onClick={submit}>Submit report</Button>
      </DialogContent>
    </Dialog>
  );
}
