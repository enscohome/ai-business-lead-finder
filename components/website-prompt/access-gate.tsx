"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Check,
  Crown,
  LayoutDashboard,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
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
import type {
  WebsitePromptEntitlement,
  WebsitePromptAccessReason,
} from "@/lib/website-prompt-entitlement";

interface AccessContextValue {
  entitlement: WebsitePromptEntitlement;
  readOnly: boolean;
  showAccessModal: (
    reason?: WebsitePromptAccessReason,
    entitlement?: WebsitePromptEntitlement,
  ) => void;
  showLimitModal: (entitlement?: WebsitePromptEntitlement) => void;
}
const AccessContext = React.createContext<AccessContextValue | null>(null);
export function useWebsitePromptAccess() {
  const context = React.useContext(AccessContext);
  if (!context)
    throw new Error("Website Prompt Builder access context is missing.");
  return context;
}

const benefits = [
  "Detailed prompts for Codex, Claude and Kimi",
  "Professional website briefs",
  "Save, edit, regenerate and download",
  "Private prompt-project history",
];
const money = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

function LockedPage({
  entitlement,
}: {
  entitlement: WebsitePromptEntitlement;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
      <Card className="w-full overflow-hidden border-primary/20 shadow-xl">
        <CardContent className="p-6 text-center sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <LockKeyhole className="h-8 w-8 text-primary" />
          </div>
          <div className="mt-5 text-sm font-semibold uppercase tracking-wider text-primary">
            Premium Feature
          </div>
          <h1 className="mt-2 text-3xl font-bold">Website Prompt Builder</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Website Prompt Builder is available on LeadPilot AI’s paid plans.
            Upgrade to generate detailed website prompts for Codex, Claude, Kimi
            and developers.
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
            Current plan: <strong>{entitlement.currentPlan.name}</strong>
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/pricing">
                <Crown className="mr-2 h-4 w-4" />
                Upgrade Plan
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AccessModal({
  entitlement,
  kind,
  open,
  onOpenChange,
}: {
  entitlement: WebsitePromptEntitlement;
  kind: "access" | "limit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const expired =
    entitlement.reason === "SUBSCRIPTION_EXPIRED" ||
    entitlement.reason === "PAYMENT_FAILED";
  const limit = kind === "limit";
  const hasHigherPlan = entitlement.currentPlan.id !== "agency";
  const title = limit
    ? "You’ve reached your monthly prompt limit"
    : expired
      ? "Your premium plan has ended"
      : "Premium access required";
  const description = limit
    ? "You have used all Website Prompt Builder generations included in your current plan."
    : expired
      ? "Your LeadPilot premium access has expired. Renew your plan to continue generating, editing and saving professional website prompts."
      : "Upgrade to a paid plan to continue with this action.";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 rounded-lg border bg-muted/40 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Plan</span>
            <strong>
              {entitlement.previousPlan?.name || entitlement.currentPlan.name}
            </strong>
          </div>
          {limit && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Generations</span>
              <strong>
                {entitlement.generationsUsed} of {entitlement.generationsLimit}
              </strong>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              {limit ? "Next reset" : "Expiry date"}
            </span>
            <strong>
              {new Date(
                (limit ? entitlement.resetAt : entitlement.expiresAt) ||
                  Date.now(),
              ).toLocaleDateString()}
            </strong>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Access</span>
            <strong>{limit ? "Active — allowance used" : "Read-only"}</strong>
          </div>
          {!limit && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Renewal</span>
              <strong>{money(entitlement.renewalPriceNgn)}/month</strong>
            </div>
          )}
        </div>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {entitlement.planBenefits.map((item) => (
            <li key={item} className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              {item}
            </li>
          ))}
        </ul>
        <DialogFooter className="gap-2">
          {limit ? (
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                router.push("/tools/website-prompt-builder/history");
              }}
            >
              View saved prompts
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Maybe later
            </Button>
          )}
          {limit && !hasHigherPlan ? (
            <Button onClick={() => onOpenChange(false)}>View reset date</Button>
          ) : (
            <Button asChild>
              <Link href="/pricing">
                {limit ? "Upgrade to continue" : "Renew Plan"}
              </Link>
            </Button>
          )}
        </DialogFooter>
        {!limit && (
          <div className="flex justify-center gap-4 text-sm">
            <Link className="text-primary underline" href="/pricing">
              View all plans
            </Link>
            <Link
              className="text-muted-foreground underline"
              href="/tools/website-prompt-builder/history"
            >
              View saved prompts
            </Link>
          </div>
        )}
        <button
          className="text-sm text-muted-foreground underline"
          onClick={() => router.push("/dashboard")}
        >
          Maybe later — return to dashboard
        </button>
      </DialogContent>
    </Dialog>
  );
}

export function WebsitePromptAccessGate({
  entitlement,
  children,
}: {
  entitlement: WebsitePromptEntitlement;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [modal, setModal] = React.useState<"access" | "limit" | null>(null);
  const [runtimeEntitlement, setRuntimeEntitlement] =
    React.useState(entitlement);
  const [expiredDismissed, setExpiredDismissed] = React.useState(false);
  const history = pathname.endsWith("/history");
  if (!entitlement.allowed && !entitlement.readOnly)
    return <LockedPage entitlement={entitlement} />;
  if (!entitlement.allowed && entitlement.readOnly && !history)
    return (
      <>
        <LockedPage entitlement={entitlement} />
        <AccessModal
          entitlement={entitlement}
          kind="access"
          open={!expiredDismissed}
          onOpenChange={(open) => {
            if (!open) setExpiredDismissed(true);
          }}
        />
      </>
    );
  const value: AccessContextValue = {
    entitlement,
    readOnly: !entitlement.allowed,
    showAccessModal: (_reason, next) => {
      if (next) setRuntimeEntitlement(next);
      setModal("access");
    },
    showLimitModal: (next) => {
      if (next) setRuntimeEntitlement(next);
      setModal("limit");
    },
  };
  return (
    <AccessContext.Provider value={value}>
      {children}
      <AccessModal
        entitlement={runtimeEntitlement}
        kind={modal || "access"}
        open={modal !== null}
        onOpenChange={(open) => !open && setModal(null)}
      />
    </AccessContext.Provider>
  );
}
