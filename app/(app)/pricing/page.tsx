import { Crown } from "lucide-react";
import { SubscriptionPlans } from "@/components/subscription-plans";

export default function PricingPage({
  searchParams,
}: {
  searchParams?: { payment?: string };
}) {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Crown className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Choose Your Plan</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Monthly subscriptions in Nigerian naira for businesses launching with
          LeadPilot AI in Nigeria.
        </p>
      </div>
      {searchParams?.payment === "success" && (
        <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-center text-sm text-emerald-700">
          Payment verified. Your plan is now active.
        </p>
      )}
      {searchParams?.payment === "failed" && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-center text-sm text-amber-700">
          Payment was not completed or could not be verified. Your account
          remains on the Free Plan.
        </p>
      )}
      <SubscriptionPlans />
    </div>
  );
}
