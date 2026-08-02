"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, User, LogOut, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationItem } from "@/components/notifications/notification-item";
export function Header() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = React.useState<SupabaseUser | null>(null);
  const [planName, setPlanName] = React.useState("Free Plan");
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const {
    items: notifications,
    unreadCount,
    markRead,
    markAll,
    loading: notificationsLoading,
  } = useNotifications();

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user)
        fetch("/api/account/usage")
          .then((response) => (response.ok ? response.json() : null))
          .then((usage) => usage && setPlanName(usage.plan.name));
    });
  }, []);
  const [searchQuery, setSearchQuery] = React.useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-8">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search businesses... (e.g., Restaurants in Lagos)"
              className="pl-10 h-10 bg-muted border-0 focus-visible:ring-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>

        {/* Right section */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => router.push("/pricing")}
            className="hidden sm:inline-flex"
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade Plan
          </Button>
          <Badge
            variant="secondary"
            className="hidden sm:flex items-center gap-1"
          >
            <Crown className="h-3 w-3 text-amber-500" />
            {planName}
          </Badge>

          <DropdownMenu
            open={notificationsOpen}
            onOpenChange={setNotificationsOpen}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[min(92vw,380px)] p-2"
            >
              <div className="flex items-center justify-between px-2 py-1">
                <DropdownMenuLabel className="p-0">
                  Notifications
                </DropdownMenuLabel>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!unreadCount}
                  onClick={(event) => {
                    event.preventDefault();
                    void markAll();
                  }}
                >
                  Mark all read
                </Button>
              </div>
              <DropdownMenuSeparator />
              <div className="max-h-[min(60vh,420px)] overflow-y-auto">
                {notificationsLoading ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    Loading...
                  </p>
                ) : notifications.length ? (
                  notifications
                    .slice(0, 5)
                    .map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onRead={markRead}
                        onNavigate={() => setNotificationsOpen(false)}
                      />
                    ))
                ) : (
                  <p className="p-4 text-sm text-muted-foreground">
                    No notifications yet.
                  </p>
                )}
              </div>
              <DropdownMenuSeparator />
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setNotificationsOpen(false);
                  router.push("/notifications");
                }}
              >
                View all notifications
              </Button>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {user?.user_metadata?.full_name?.charAt(0) ||
                      user?.email?.charAt(0) ||
                      "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">
                    {user?.user_metadata?.full_name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.email || ""}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/pricing")}>
                <Crown className="mr-2 h-4 w-4 text-amber-500" />
                Upgrade Plan
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
