"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Settings, User, Bell, Shield, CreditCard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { OwnerAccessSummary } from "@/components/account/owner-access-summary";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
const [user, setUser] = React.useState<SupabaseUser | null>(null);
const [fullName, setFullName] = React.useState("");
const [phone, setPhone] = React.useState("");
const [company, setCompany] = React.useState("");
const [accountUsage, setAccountUsage] = React.useState<any>(null);
React.useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
  const currentUser = data.user;
setUser(currentUser);
setFullName(currentUser?.user_metadata?.full_name || "");
setPhone(currentUser?.user_metadata?.phone || "");
setCompany(currentUser?.user_metadata?.company || "");
  });
  fetch("/api/account/usage")
    .then((response) => (response.ok ? response.json() : null))
    .then(setAccountUsage);
}, []);
const handleSaveChanges = async () => {
  const { data, error } = await supabase.auth.updateUser({
    data: {
      full_name: fullName,
      phone: phone,
      company: company,
    },
  });

  if (error) {
    alert(error.message);
    return;
  }

  setUser(data.user);
  alert("Profile updated successfully!");
};
  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/auth/login");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
               <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input defaultValue={user?.email || ""} type="email" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                 <Input
  value={phone}
  onChange={(e) => setPhone(e.target.value)}
  placeholder="+234 800 000 0000"
/>
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                 <Input
  value={company}
  onChange={(e) => setCompany(e.target.value)}
  placeholder="Your Company"
/>
                </div>
              </div>
              <Button onClick={handleSaveChanges}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Email notifications for new leads", desc: "Get notified when you save a new lead" },
                { label: "Daily search summary", desc: "Receive a daily email with your search activity" },
                { label: "Lead status updates", desc: "Get notified when a lead status changes" },
                { label: "Marketing emails", desc: "Receive updates about new features and offers" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch defaultChecked={item.label.includes("Email")} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!accountUsage ? (
                <p className="text-sm text-muted-foreground">
                  Loading account access...
                </p>
              ) : accountUsage.isOwner ? (
                <OwnerAccessSummary />
              ) : (
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-semibold">{accountUsage?.plan?.name || "Free Plan"}</p>
                  <p className="text-sm text-muted-foreground">
                    {accountUsage
                      ? `${accountUsage.searchesUsed} of ${accountUsage.searchesLimit} searches used this month`
                      : "Loading plan usage..."}
                  </p>
                </div>
                <Badge variant="secondary">Active</Badge>
              </div>
              )}
            </CardContent>
          </Card>
          {accountUsage && !accountUsage.isOwner && (
            <Button onClick={() => router.push("/pricing")}>View pricing and upgrade</Button>
          )}
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <Button>Update Password</Button>
              <Separator className="my-4" />
              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Log Out
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
