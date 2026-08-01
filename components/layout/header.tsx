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
export function Header() {
  const router = useRouter();
  const supabase = createClient();
const [user, setUser] = React.useState<SupabaseUser | null>(null);
const [planName, setPlanName] = React.useState("Free Plan");

React.useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    setUser(data.user);
    if (data.user) fetch("/api/account/usage").then(response => response.ok ? response.json() : null).then(usage => usage && setPlanName(usage.plan.name));
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
          <Button size="sm" onClick={() => router.push("/pricing")} className="hidden sm:inline-flex">
            <Crown className="h-4 w-4 mr-2" />
            Upgrade Plan
          </Button>
          <Badge variant="secondary" className="hidden sm:flex items-center gap-1">
            <Crown className="h-3 w-3 text-amber-500" />
            {planName}
          </Badge>

          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                   {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
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
