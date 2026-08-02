"use client";

import * as React from "react";
import { Users, Plus, Mail, Crown, Shield, UserX, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  avatar?: string;
  joinedAt: string;
  status: "active" | "pending";
}

const mockTeam: TeamMember[] = [];
 

export default function TeamPage() {
  const [members, setMembers] = React.useState<TeamMember[]>(mockTeam);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState("member");
  const [isInviting, setIsInviting] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [teamLimit, setTeamLimit] = React.useState<number | null>(1);
  const [usageLoaded, setUsageLoaded] = React.useState(false);
  React.useEffect(() => { fetch("/api/account/usage").then(response => response.ok ? response.json() : null).then(usage => usage && setTeamLimit(usage.teamMembersLimit)).finally(() => setUsageLoaded(true)); }, []);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !inviteEmail.trim() ||
      !usageLoaded ||
      (teamLimit !== null &&
        (teamLimit < 2 || members.length + 1 >= teamLimit))
    ) return;

    setIsInviting(true);
    setTimeout(() => {
      const newMember: TeamMember = {
        id: Math.random().toString(36).substring(2, 9),
        name: inviteEmail.split("@")[0],
        email: inviteEmail,
        role: inviteRole as TeamMember["role"],
        joinedAt: "",
        status: "pending",
      };
      setMembers([...members, newMember]);
      setInviteEmail("");
      setIsInviting(false);
      setDialogOpen(false);
    }, 1000);
  };

  const handleRemove = (id: string) => {
    setMembers(members.filter((m) => m.id !== id));
  };

  const handleChangeRole = (id: string, role: TeamMember["role"]) => {
    setMembers(members.map((m) => m.id === id ? { ...m, role } : m));
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner": return <Crown className="h-3.5 w-3.5 text-amber-500" />;
      case "admin": return <Shield className="h-3.5 w-3.5 text-blue-500" />;
      default: return <Users className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      owner: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      admin: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      member: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    };
    return styles[role as keyof typeof styles] || styles.member;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Team Management</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your agency team members and permissions
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!usageLoaded || (teamLimit !== null && (teamLimit < 2 || members.length + 1 >= teamLimit))}>
              <Plus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation email to join your team.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@company.com"
                    className="pl-10"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member — Can view and save leads</SelectItem>
                    <SelectItem value="admin">Admin — Can manage team and export data</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isInviting}>
                  {isInviting ? "Sending..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{members.length}</p>
            <p className="text-sm text-muted-foreground">Total Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{members.filter((m) => m.status === "active").length}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{members.filter((m) => m.status === "pending").length}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {!usageLoaded
              ? "Loading account access..."
              : teamLimit === null
              ? `${members.length + 1} seats used · Unlimited owner access`
              : `${members.length + 1} of ${teamLimit} seats used (including you)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                      {member.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{member.name}</p>
                      <Badge variant="outline" className={cn("text-xs capitalize", getRoleBadge(member.role))}>
                        <span className="flex items-center gap-1">
                          {getRoleIcon(member.role)}
                          {member.role}
                        </span>
                      </Badge>
                      {member.status === "pending" && (
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600">
                          Pending
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {member.joinedAt && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </span>
                  )}
                  {member.role !== "owner" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleChangeRole(member.id, "admin")}>
                          <Shield className="h-4 w-4 mr-2" />
                          Make Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangeRole(member.id, "member")}>
                          <Users className="h-4 w-4 mr-2" />
                          Make Member
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRemove(member.id)} className="text-red-600">
                          <UserX className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {!usageLoaded
                ? "Loading account access..."
                : teamLimit === null
                ? "LeadPilot Owner includes unlimited team access."
                : teamLimit < 2
                  ? "Team access is available on Agency."
                  : "Agency includes up to 3 members."}
            </span>
            {usageLoaded && teamLimit !== null && teamLimit < 2 && <Button asChild variant="link" size="sm" className="h-auto p-0"><Link href="/pricing">View Agency</Link></Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
