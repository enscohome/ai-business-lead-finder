"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Crown, LockKeyhole, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AutomationBuilderEntitlement } from "@/lib/automation-builder/entitlement";

interface AutomationAccessContextValue {
  entitlement: AutomationBuilderEntitlement;
  readOnly: boolean;
  showLimit: (next?: AutomationBuilderEntitlement) => void;
}

const AutomationAccessContext =
  React.createContext<AutomationAccessContextValue | null>(null);

export function useAutomationBuilderAccess() {
  const context = React.useContext(AutomationAccessContext);
  if (!context) throw new Error("AI Automation Builder access context is missing.");
  return context;
}

const benefits = [
  "Simple chat-based automation design",
  "Validated importable n8n workflow JSON",
  "Professional PDF setup guide",
  "Visual workflow preview and saved project history",
];

function LockedPage({ entitlement }: { entitlement: AutomationBuilderEntitlement }) {
  const expired = entitlement.readOnly;
  const suspended = entitlement.reason === "ACCOUNT_SUSPENDED";
  const unavailable = entitlement.reason === "COUNTRY_UNAVAILABLE";
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
      <Card className="w-full border-primary/20 shadow-xl">
        <CardContent className="p-6 text-center sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <LockKeyhole className="h-8 w-8 text-primary" />
          </div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-primary">
            {expired ? "Premium access ended" : "Premium feature"}
          </p>
          <h1 className="mt-2 text-3xl font-bold">AI Automation Builder</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {suspended
              ? "This account is suspended. Contact LeadPilot AI support before trying again."
              : unavailable
                ? "AI Automation Builder is currently available only for approved Nigeria accounts."
                : expired
                  ? "Renew your existing LeadPilot plan to generate or edit n8n workflow projects. Your saved projects remain available from history."
                  : "Upgrade to an eligible existing LeadPilot plan to design, validate, save, and download professional n8n workflows."}
          </p>
          <div className="mx-auto mt-6 grid max-w-xl gap-3 text-left sm:grid-cols-2">
            {benefits.map((item) => (
              <div key={item} className="flex gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {item}
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm">
            Current account: <strong>{entitlement.currentPlan.name}</strong>
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {!suspended && !unavailable && (
              <Button asChild>
                <Link href="/pricing">
                  <Crown className="mr-2 h-4 w-4" />
                  {expired ? "Renew Plan" : "Upgrade Plan"}
                </Link>
              </Button>
            )}
            {expired && (
              <Button asChild variant="outline">
                <Link href="/tools/automation-builder/history">
                  <Workflow className="mr-2 h-4 w-4" />
                  View saved automations
                </Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LimitDialog({
  open,
  onOpenChange,
  entitlement,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entitlement: AutomationBuilderEntitlement;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Monthly AI builder limit reached</DialogTitle>
          <DialogDescription>
            You have used the existing monthly builder allowance included in
            your {entitlement.currentPlan.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/40 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Usage</span>
            <strong>
              {entitlement.generationsUsed} of {entitlement.generationsLimit}
            </strong>
          </div>
          <div className="mt-2 flex justify-between gap-4">
            <span className="text-muted-foreground">Reset</span>
            <strong>
              {entitlement.resetAt
                ? new Date(entitlement.resetAt).toLocaleDateString()
                : "Not scheduled"}
            </strong>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <Button asChild>
            <Link href="/pricing">View plans</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AutomationBuilderAccessGate({
  entitlement,
  children,
}: {
  entitlement: AutomationBuilderEntitlement;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const history = pathname.endsWith("/history");
  const [limitOpen, setLimitOpen] = React.useState(false);
  const [runtimeEntitlement, setRuntimeEntitlement] = React.useState(entitlement);
  if (!entitlement.allowed && !(entitlement.readOnly && history))
    return <LockedPage entitlement={entitlement} />;
  return (
    <AutomationAccessContext.Provider
      value={{
        entitlement,
        readOnly: !entitlement.allowed,
        showLimit: (next) => {
          if (entitlement.isOwner) return;
          if (next) setRuntimeEntitlement(next);
          setLimitOpen(true);
        },
      }}
    >
      {children}
      {!entitlement.isOwner && (
        <LimitDialog
          open={limitOpen}
          onOpenChange={setLimitOpen}
          entitlement={runtimeEntitlement}
        />
      )}
    </AutomationAccessContext.Provider>
  );
}
