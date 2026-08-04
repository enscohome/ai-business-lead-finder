"use client";
import * as React from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function CommunityReportDialog({ entityType, entityId }: { entityType: "opportunity" | "conversation"; entityId: string }) {
  const [open, setOpen] = React.useState(false), [reason, setReason] = React.useState("scam_fraud"), [explanation, setExplanation] = React.useState(""), [message, setMessage] = React.useState("");
  const submit = async () => {
    const response = await fetch("/api/opportunities/reports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entityType, entityId, reason, explanation }) });
    const data = await response.json(); setMessage(response.ok ? "Report submitted privately for moderation." : data.error);
  };
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="ghost" size="sm"><Flag className="mr-2 h-4 w-4" />Report</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Report {entityType}</DialogTitle></DialogHeader><Select value={reason} onValueChange={setReason}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="scam_fraud">Scam or fraud</SelectItem><SelectItem value="spam">Spam</SelectItem><SelectItem value="harassment">Harassment</SelectItem><SelectItem value="inappropriate_content">Inappropriate content</SelectItem><SelectItem value="misleading_opportunity">Misleading opportunity</SelectItem><SelectItem value="illegal_work">Request for illegal work</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select><Textarea maxLength={2000} placeholder="Optional explanation" value={explanation} onChange={(e) => setExplanation(e.target.value)} />{message && <p role="status" className="text-sm">{message}</p>}<Button onClick={submit}>Submit report</Button></DialogContent></Dialog>;
}
