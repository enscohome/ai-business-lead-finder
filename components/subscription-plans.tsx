"use client";

import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Free",
    description: "Perfect for getting started",
    price: 0,
    period: "month",
    features: [
      "20 searches per day",
      "Up to 50 saved leads",
      "Basic business info",
      "Email support",
    ],
    highlighted: false,
    cta: "Get Started",
  },
  {
    name: "Pro",
    description: "For serious freelancers & agencies",
    price: 29,
    period: "month",
    features: [
      "Unlimited searches",
      "Unlimited saved leads",
      "AI outreach generator",
      "Priority support",
      "Advanced filters",
      "Export to CSV",
    ],
    highlighted: true,
    cta: "Upgrade to Pro",
  },
  {
    name: "Agency",
    description: "For teams and enterprises",
    price: 99,
    period: "month",
    features: [
      "Everything in Pro",
      "Team accounts (up to 10)",
      "CRM integrations",
      "API access",
      "White-label options",
      "Dedicated support",
    ],
    highlighted: false,
    cta: "Contact Sales",
  },
];

export function SubscriptionPlans() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan) => (
        <Card
          key={plan.name}
          className={cn(
            "relative flex flex-col",
            plan.highlighted && "border-primary shadow-lg scale-105 z-10"
          )}
        >
          {plan.highlighted && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">
                <Zap className="h-3 w-3 mr-1" />
                Most Popular
              </Badge>
            </div>
          )}
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">${plan.price}</span>
              <span className="text-muted-foreground">/{plan.period}</span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <ul className="space-y-3 mb-6 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              variant={plan.highlighted ? "default" : "outline"}
              className="w-full"
            >
              {plan.cta}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
