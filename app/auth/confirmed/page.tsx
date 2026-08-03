"use client";

import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { LeadPilotLogo } from "@/components/branding/leadpilot-logo";

export default function ConfirmedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full rounded-lg border bg-card p-8 text-center shadow">
        <LeadPilotLogo size="large" priority className="mx-auto mb-4" />
        <h1 className="mb-4 flex items-center justify-center gap-2 text-3xl font-bold text-green-600">
          <CheckCircle className="h-8 w-8" aria-hidden="true" />
          Email Verified!
        </h1>

        <p className="text-muted-foreground mb-6">
          Your account has been verified successfully.
          <br />
          You can now log in and start finding business leads with AI.
        </p>

        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-primary-foreground font-medium hover:opacity-90"
        >
          Continue to Login
        </Link>
      </div>
    </div>
  );
}
