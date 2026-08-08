"use client";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { OpportunityForm, type OpportunityFormValue } from "@/components/opportunities/opportunity-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditOpportunityPage() {
  const id = useParams<{ id: string }>().id, router = useRouter();
  const [initial, setInitial] = React.useState<OpportunityFormValue | null>(null), [message, setMessage] = React.useState("");
  React.useEffect(() => { fetch(`/api/opportunities/${id}`).then(async (r) => { const d = await r.json(); if (!r.ok || !d.opportunity.is_owner) return setMessage(d.error || "Only the job poster can edit this opportunity."); const o = d.opportunity; setInitial({ title: o.title, description: o.description, category: o.category, skills: o.skills.join(", "), countryCode: o.country_code, city: o.city || "", workLocationType: o.work_location_type, budgetType: o.budget_type, budgetMin: o.budget_min?.toString() || "", budgetMax: o.budget_max?.toString() || "", currency: o.currency, experienceLevel: o.experience_level, deliveryTime: o.delivery_time, applicationDeadline: o.application_deadline ? o.application_deadline.slice(0,16) : "", applicationQuestions: o.application_questions.join("\n") }); }); }, [id]);
  const submit = async (value: OpportunityFormValue) => { const r = await fetch(`/api/opportunities/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "edit", ...value, skills: value.skills.split(","), applicationQuestions: value.applicationQuestions.split("\n").filter(Boolean) }) }); const d = await r.json(); if (!r.ok) return setMessage(d.error); router.push(`/opportunities/${id}`); router.refresh(); };
  if (!initial) return message ? <p role="alert" className="text-destructive">{message}</p> : <Skeleton className="mx-auto h-[600px] max-w-4xl rounded-xl" />;
  return <div className="mx-auto max-w-4xl space-y-6"><div><h1 className="text-3xl font-bold">Edit opportunity</h1><p className="text-muted-foreground">Important changes to an approved post return it to moderation before it becomes public again.</p></div><Card><CardHeader><CardTitle>Work details</CardTitle></CardHeader><CardContent>{message && <p role="alert" className="mb-4 text-sm text-destructive">{message}</p>}<OpportunityForm initial={initial} submitLabel="Save changes" onSubmit={submit} /></CardContent></Card></div>;
}
