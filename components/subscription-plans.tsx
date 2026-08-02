"use client";

import * as React from "react";
import { Check, Loader2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLANS, type PlanId } from "@/lib/plans";
import { cn } from "@/lib/utils";

export function SubscriptionPlans() {
  const router = useRouter();
  const [loading, setLoading] = React.useState<PlanId | null>(null);
  const [error, setError] = React.useState("");

  const choosePlan = async (plan: PlanId) => {
    if (plan === "free") return router.push("/dashboard");
    setLoading(plan);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const responseText = await response.text();
      let data: { error?: string; url?: string } = {};
      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error(
            "Checkout returned an invalid response. Please try again later.",
          );
        }
      }
      if (!response.ok)
        throw new Error(data.error || "Unable to start checkout.");
      if (!data.url)
        throw new Error("Checkout did not return a payment address.");
      window.location.assign(data.url);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to start checkout.",
      );
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Object.values(PLANS).map((plan) => {
          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col",
                plan.highlighted && "border-primary shadow-lg",
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge>
                    <Zap className="mr-1 h-3 w-3" />
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-4 text-center">
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  {plan.id === "free"
                    ? "Explore LeadPilot AI"
                    : "Monthly subscription"}
                </CardDescription>
                <div className="mt-3">
                  <span className="text-3xl font-bold">
                    ₦{plan.priceNgn.toLocaleString("en-NG")}
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="mb-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.highlighted ? "default" : "outline"}
                  disabled={loading !== null}
                  onClick={() => choosePlan(plan.id)}
                >
                  {loading === plan.id && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {plan.id === "free"
                    ? "Continue with Free"
                    : `Choose ${plan.name.replace(" Plan", "")}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
