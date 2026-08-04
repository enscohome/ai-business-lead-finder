"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Search,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  Building2,
  UserCircle,
  Star,
  WandSparkles,
  Workflow,
  BriefcaseBusiness,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadPilotLogo } from "@/components/branding/leadpilot-logo";
import { ThemeToggle } from "./theme-toggle";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Search Leads", href: "/search", icon: Search },
  { name: "Saved Leads", href: "/leads", icon: Users },
  { name: "Freelancer Profile", href: "/profile", icon: UserCircle },
  { name: "Client Reviews", href: "/client-reviews", icon: Star },
  { name: "Job Opportunities", href: "/opportunities", icon: BriefcaseBusiness },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  {
    name: "Website Prompt Builder",
    href: "/tools/website-prompt-builder",
    icon: WandSparkles,
  },
  {
    name: "AI Automation Builder",
    href: "/tools/automation-builder",
    icon: Workflow,
  },
  { name: "Team", href: "/team", icon: Building2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [controlCentreAccess, setControlCentreAccess] = React.useState(false);
  React.useEffect(() => {
    let active = true;
    fetch("/api/admin/control-centre?view=access")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (active) setControlCentreAccess(data?.allowed === true); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="h-10 w-10 bg-background/80 backdrop-blur-sm border"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:h-screen flex flex-col",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <Link
          href="/dashboard"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-6 py-5 border-b hover:bg-accent/50 transition-colors"
        >
          <LeadPilotLogo size="standard" priority />
          <div>
            <h1 className="text-lg font-bold leading-tight">LeadPilot AI</h1>

            <p className="text-xs text-muted-foreground">
              Find Your Next Client
            </p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <item.icon
                  className={cn("h-5 w-5", isActive && "text-primary")}
                />
                {item.name}
              </Link>
            );
          })}
          {controlCentreAccess && (
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === "/admin" || pathname.startsWith("/admin/")
                  ? "bg-blue-500/10 text-blue-400"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <ShieldCheck className="h-5 w-5" />
              Owner Control Centre
            </Link>
          )}
        </nav>

        {/* Bottom section */}
        <div className="px-3 py-4 border-t space-y-1">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === "/settings"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </>
  );
}
