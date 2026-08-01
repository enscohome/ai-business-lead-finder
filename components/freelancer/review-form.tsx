"use client";
import * as React from "react";
import { CheckCircle2, Loader2, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
export function ReviewForm({ token }: { token: string }) {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [rating, setRating] = React.useState(0);
  const [form, setForm] = React.useState({
    clientName: "",
    clientCompany: "",
    reviewText: "",
    honest: false,
  });
  const [message, setMessage] = React.useState("");
  const [done, setDone] = React.useState(false);
  React.useEffect(() => {
    fetch(`/api/reviews/${token}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setData(d);
        setForm((v) => ({ ...v, clientName: d.request.clientName || "" }));
      })
      .catch((e) => setMessage(e.message))
      .finally(() => setLoading(false));
  }, [token]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const r = await fetch(`/api/reviews/${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, rating }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setDone(true);
      setMessage(d.message);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not submit review.");
    } finally {
      setLoading(false);
    }
  };
  if (loading && !data)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  if (done)
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-lg">
          <CardContent className="p-10 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h1 className="mt-4 text-2xl font-bold">Thank you</h1>
            <p className="mt-2 text-muted-foreground">{message}</p>
          </CardContent>
        </Card>
      </main>
    );
  if (!data)
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-red-600">
          {message || "This review link is unavailable."}
        </p>
      </main>
    );
  const disabled = data.request.status !== "pending";
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-12">
      <Card className="mx-auto max-w-xl">
        <CardHeader className="items-center text-center">
          <Avatar className="h-20 w-20">
            <AvatarImage src={data.freelancer.profileImageUrl || undefined} />
            <AvatarFallback>
              {data.freelancer.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="mt-3">Review {data.freelancer.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {data.request.projectTitle}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <Label>
                How was your experience working with this freelancer?
              </Label>
              <div className="mt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setRating(value)}
                    aria-label={`${value} stars`}
                  >
                    <Star
                      className={`h-8 w-8 ${value <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="review">Written review</Label>
              <Textarea
                id="review"
                rows={6}
                value={form.reviewText}
                onChange={(e) =>
                  setForm({ ...form, reviewText: e.target.value })
                }
                placeholder="Describe the work, communication and result…"
                required
                minLength={20}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="clientName">Your name</Label>
                <Input
                  id="clientName"
                  value={form.clientName}
                  onChange={(e) =>
                    setForm({ ...form, clientName: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="company">Company (optional)</Label>
                <Input
                  id="company"
                  value={form.clientCompany}
                  onChange={(e) =>
                    setForm({ ...form, clientCompany: e.target.value })
                  }
                />
              </div>
            </div>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.honest}
                onChange={(e) => setForm({ ...form, honest: e.target.checked })}
              />
              <span>
                I confirm this review is honest and based on real work completed
                with this freelancer.
              </span>
            </label>
            {message && (
              <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">
                {message}
              </p>
            )}
            <Button className="w-full" disabled={loading || disabled}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {disabled
                ? "Review link already used or expired"
                : "Submit Review"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
