"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OpportunityForm, type OpportunityFormValue } from "@/components/opportunities/opportunity-form";

export default function NewOpportunityPage() {
  const router = useRouter(), [message, setMessage] = React.useState("");
  const submit = async (value: OpportunityFormValue) => {
    setMessage("");
    const response = await fetch("/api/opportunities", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...value, skills: value.skills.split(","), applicationQuestions: value.applicationQuestions.split("\n").filter(Boolean) }) });
    const data = await response.json(); if (!response.ok) return setMessage(data.error);
    router.push(`/opportunities/${data.opportunity.id}`); router.refresh();
  };
  return <div className="mx-auto max-w-4xl space-y-6"><div><h1 className="text-3xl font-bold">Post an opportunity</h1><p className="text-muted-foreground">New posts stay private while the LeadPilot moderation team reviews them.</p></div><Card><CardHeader><CardTitle>Work details</CardTitle></CardHeader><CardContent>{message && <p role="alert" className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{message}</p>}<OpportunityForm onSubmit={submit} /></CardContent></Card></div>;
}
