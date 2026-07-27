"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X, Search, Target, MessageSquare, BarChart3, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const steps = [
  {
    title: "Search for Businesses",
    description: "Enter a business type and city to discover local leads.",
    icon: Search,
    color: "text-blue-600 bg-blue-500/10",
    action: "Try a Search",
    route: "/search",
  },
  {
    title: "Review Opportunity Scores",
    description: "Our AI analyzes each business to show you the hottest opportunities.",
    icon: Target,
    color: "text-emerald-600 bg-emerald-500/10",
    action: "Learn More",
    route: "/search",
  },
  {
    title: "Generate AI Outreach",
    description: "Create personalized pitches, WhatsApp messages, and call scripts instantly.",
    icon: MessageSquare,
    color: "text-purple-600 bg-purple-500/10",
    action: "See How",
    route: "/search",
  },
  {
    title: "Track Your Pipeline",
    description: "Save leads, add notes, and track them from new to closed.",
    icon: BarChart3,
    color: "text-amber-600 bg-amber-500/10",
    action: "View Dashboard",
    route: "/dashboard",
  },
];

export function OnboardingModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);

  React.useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    if (!hasSeenOnboarding) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("hasSeenOnboarding", "true");
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleSkip = () => {
    handleClose();
  };

  const handleAction = () => {
    handleClose();
    router.push(steps[currentStep].route);
  };

  if (!isOpen) return null;

  const step = steps[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg relative">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <CardContent className="p-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </span>
              <button onClick={handleSkip} className="text-sm text-muted-foreground hover:text-foreground">
                Skip tour
              </button>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="text-center mb-8">
            <div className={cn("inline-flex p-4 rounded-2xl mb-4", step.color)}>
              <Icon className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{step.title}</h2>
            <p className="text-muted-foreground">{step.description}</p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleAction}>
              {step.action}
            </Button>
            <Button className="flex-1" onClick={handleNext}>
              {currentStep === steps.length - 1 ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
