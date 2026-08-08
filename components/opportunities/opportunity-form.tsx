"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OPPORTUNITY_CATEGORIES } from "@/types/job-opportunity";

export interface OpportunityFormValue {
  title: string; description: string; category: string; skills: string;
  countryCode: string; city: string; workLocationType: string; budgetType: string;
  budgetMin: string; budgetMax: string; currency: string; experienceLevel: string;
  deliveryTime: string; applicationDeadline: string; applicationQuestions: string;
}
export const EMPTY_OPPORTUNITY: OpportunityFormValue = {
  title: "", description: "", category: "AI Automation", skills: "", countryCode: "NG", city: "",
  workLocationType: "remote", budgetType: "negotiable", budgetMin: "", budgetMax: "", currency: "NGN",
  experienceLevel: "intermediate", deliveryTime: "", applicationDeadline: "", applicationQuestions: "",
};

function Field({ label, children, optional }: { label: string; children: React.ReactNode; optional?: boolean }) {
  return <div className="space-y-1.5"><Label>{label}{optional && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}</Label>{children}</div>;
}

export function OpportunityForm({ initial = EMPTY_OPPORTUNITY, submitLabel = "Submit for review", onSubmit }: { initial?: OpportunityFormValue; submitLabel?: string; onSubmit: (value: OpportunityFormValue) => Promise<void> }) {
  const [value, setValue] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const update = (key: keyof OpportunityFormValue, next: string) => setValue((current) => ({ ...current, [key]: next }));
  return <form className="space-y-6" onSubmit={async (event) => { event.preventDefault(); setBusy(true); await onSubmit(value); setBusy(false); }}>
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2"><Field label="Opportunity title"><Input required minLength={5} maxLength={160} value={value.title} onChange={(e) => update("title", e.target.value)} /></Field></div>
      <div className="sm:col-span-2"><Field label="Description of the work"><Textarea required minLength={30} maxLength={12000} className="min-h-40" value={value.description} onChange={(e) => update("description", e.target.value)} /></Field></div>
      <Field label="Category"><Select value={value.category} onValueChange={(v) => update("category", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OPPORTUNITY_CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Skills required"><Input required placeholder="n8n, API integration, JavaScript" value={value.skills} onChange={(e) => update("skills", e.target.value)} /></Field>
      <Field label="Country"><Select value={value.countryCode} onValueChange={(v) => update("countryCode", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NG">Nigeria</SelectItem></SelectContent></Select></Field>
      <Field label="City or area" optional><Input maxLength={120} value={value.city} onChange={(e) => update("city", e.target.value)} /></Field>
      <Field label="Work location"><Select value={value.workLocationType} onValueChange={(v) => update("workLocationType", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="remote">Remote</SelectItem><SelectItem value="onsite">Onsite</SelectItem><SelectItem value="hybrid">Hybrid</SelectItem></SelectContent></Select></Field>
      <Field label="Budget type"><Select value={value.budgetType} onValueChange={(v) => update("budgetType", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fixed">Fixed-price</SelectItem><SelectItem value="hourly">Hourly</SelectItem><SelectItem value="negotiable">Negotiable</SelectItem></SelectContent></Select></Field>
      <Field label="Minimum budget" optional><Input type="number" min="0" step="0.01" value={value.budgetMin} onChange={(e) => update("budgetMin", e.target.value)} /></Field>
      <Field label="Maximum budget" optional><Input type="number" min="0" step="0.01" value={value.budgetMax} onChange={(e) => update("budgetMax", e.target.value)} /></Field>
      <Field label="Currency"><Select value={value.currency} onValueChange={(v) => update("currency", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NGN">Nigerian naira (NGN)</SelectItem></SelectContent></Select></Field>
      <Field label="Experience level"><Select value={value.experienceLevel} onValueChange={(v) => update("experienceLevel", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="entry">Entry</SelectItem><SelectItem value="intermediate">Intermediate</SelectItem><SelectItem value="expert">Expert</SelectItem></SelectContent></Select></Field>
      <Field label="Expected delivery time"><Input required maxLength={160} placeholder="For example, 2–3 weeks" value={value.deliveryTime} onChange={(e) => update("deliveryTime", e.target.value)} /></Field>
      <Field label="Application deadline" optional><Input type="datetime-local" value={value.applicationDeadline} onChange={(e) => update("applicationDeadline", e.target.value)} /></Field>
      <div className="sm:col-span-2"><Field label="Questions applicants must answer" optional><Textarea placeholder="Enter one question per line" value={value.applicationQuestions} onChange={(e) => update("applicationQuestions", e.target.value)} /></Field></div>
    </div>
    <Button type="submit" disabled={busy}>{busy ? "Saving…" : submitLabel}</Button>
  </form>;
}
