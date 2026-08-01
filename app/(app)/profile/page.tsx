"use client";
import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  Eye,
  Loader2,
  Save,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  completionSuggestion,
  DEFAULT_VISIBILITY,
  SOCIAL_PLATFORMS,
} from "@/lib/freelancer";
import { ImageUploader } from "@/components/freelancer/image-uploader";
import { PortfolioEditor } from "@/components/freelancer/portfolio-editor";
import { StructuredListEditor } from "@/components/freelancer/structured-list-editor";
import { VerificationApplication } from "@/components/freelancer/verification-application";
const blank: any = {
  username: "",
  fullName: "",
  displayName: "",
  professionalTitle: "",
  profileImageUrl: null,
  coverImageUrl: null,
  shortBio: "",
  fullBio: "",
  country: "Nigeria",
  city: "",
  languages: [],
  skills: [],
  services: [],
  industries: [],
  yearsOfExperience: "",
  hourlyRate: "",
  startingPrice: "",
  currency: "NGN",
  availabilityStatus: "available",
  preferredContactMethod: "email",
  contactEmail: "",
  contactPhone: "",
  profileVisibility: "public",
  visibility: DEFAULT_VISIBILITY,
  workExperience: [],
  education: [],
  certifications: [],
  profileCompletionPercentage: 0,
  verificationStatus: "not_verified",
};
const comma = (value: string) =>
  value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
export default function ProfileEditorPage() {
  const [profile, setProfile] = React.useState<any>(blank);
  const [links, setLinks] = React.useState<any[]>([]);
  const [projects, setProjects] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const load = React.useCallback(() => {
    setLoading(true);
    fetch("/api/freelancer/profile")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (d.profile) setProfile(d.profile);
        setLinks(
          (d.socialLinks || []).map((l: any) => ({
            platform: l.platform,
            profileUrl: l.profile_url || l.profileUrl,
            isVisible: l.is_visible ?? l.isVisible,
          })),
        );
        setProjects(d.portfolio || []);
      })
      .catch((e) => setMessage(e.message))
      .finally(() => setLoading(false));
  }, []);
  React.useEffect(load, [load]);
  const set = (key: string, value: any) =>
    setProfile((p: any) => ({ ...p, [key]: value }));
  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/freelancer/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...profile, socialLinks: links }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setProfile(data.profile);
      setMessage("Profile saved successfully.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };
  const percent = profile.profileCompletionPercentage || 0;
  const shareUrl = profile.username && typeof window !== "undefined"
    ? `${window.location.origin}/freelancer/${profile.username}`
    : "";
  if (loading)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UserCircle className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Freelancer Profile</h1>
          </div>
          <p className="mt-1 text-muted-foreground">
            Build a professional identity page you can share with clients.
          </p>
        </div>
        <div className="flex gap-2">
          {profile.username && (
            <Button variant="outline" asChild>
              <Link href={`/freelancer/${profile.username}`} target="_blank">
                <Eye className="mr-2 h-4 w-4" />
                View public profile
              </Link>
            </Button>
          )}
          <Button onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save profile
          </Button>
        </div>
      </div>
      <Card className="border-primary/20">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="font-medium">Profile completion</p>
            <strong>{percent}%</strong>
          </div>
          <Progress value={percent} className="mt-2" />
          <p className="mt-2 text-sm text-muted-foreground">
            {completionSuggestion(
              percent,
              profile,
              projects.length,
              links.length,
            )}
          </p>
          {shareUrl && (
            <div className="mt-3 flex items-center gap-2">
              <Input readOnly value={shareUrl} />
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigator.clipboard.writeText(shareUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      {message && (
        <p
          className={`rounded-lg p-3 text-sm ${message.includes("success") ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}
        >
          {message}
        </p>
      )}
      <Tabs defaultValue="identity">
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="identity">Identity</TabsTrigger>
          <TabsTrigger value="expertise">Expertise</TabsTrigger>
          <TabsTrigger value="career">Career</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
        </TabsList>
        <TabsContent value="identity">
          <Card>
            <CardContent className="space-y-6 p-6">
              <ImageUploader
                label="Cover banner"
                value={profile.coverImageUrl}
                kind="cover"
                aspect={3}
                onChange={(url) => set("coverImageUrl", url)}
              />
              <ImageUploader
                label="Professional profile photo"
                value={profile.profileImageUrl}
                kind="profile"
                onChange={(url) => set("profileImageUrl", url)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Unique username">
                  <Input
                    value={profile.username}
                    onChange={(e) =>
                      set("username", e.target.value.toLowerCase())
                    }
                    placeholder="prosper-ai"
                  />
                  <p className="text-xs text-muted-foreground">
                    3–30 lowercase letters, numbers, hyphens or underscores.
                    Changes are limited.
                  </p>
                </Field>
                <Field label="Full legal/professional name">
                  <Input
                    value={profile.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                  />
                </Field>
                <Field label="Professional display name">
                  <Input
                    value={profile.displayName}
                    onChange={(e) => set("displayName", e.target.value)}
                  />
                </Field>
                <Field label="Professional title">
                  <Input
                    value={profile.professionalTitle}
                    onChange={(e) => set("professionalTitle", e.target.value)}
                    placeholder="Website Designer and AI Automation Specialist"
                  />
                </Field>
                <Field label="Country">
                  <Input
                    value={profile.country}
                    onChange={(e) => set("country", e.target.value)}
                  />
                </Field>
                <Field label="City/location">
                  <Input
                    value={profile.city}
                    onChange={(e) => set("city", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Short introduction">
                <Textarea
                  maxLength={300}
                  value={profile.shortBio}
                  onChange={(e) => set("shortBio", e.target.value)}
                  placeholder="A concise statement for the top of your profile."
                />
              </Field>
              <Field label="Detailed biography">
                <Textarea
                  rows={8}
                  maxLength={5000}
                  value={profile.fullBio}
                  onChange={(e) => set("fullBio", e.target.value)}
                />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="expertise">
          <Card>
            <CardContent className="grid gap-5 p-6 sm:grid-cols-2">
              <CommaField
                label="Languages spoken"
                value={profile.languages}
                onChange={(v) => set("languages", v)}
              />
              <CommaField
                label="Skills"
                value={profile.skills}
                onChange={(v) => set("skills", v)}
              />
              <CommaField
                label="Services offered"
                value={profile.services}
                onChange={(v) => set("services", v)}
              />
              <CommaField
                label="Industries served"
                value={profile.industries}
                onChange={(v) => set("industries", v)}
              />
              <Field label="Years of experience">
                <Input
                  type="number"
                  min={0}
                  max={80}
                  value={profile.yearsOfExperience ?? ""}
                  onChange={(e) => set("yearsOfExperience", e.target.value)}
                />
              </Field>
              <Field label="Availability">
                <Select
                  value={profile.availabilityStatus}
                  onValueChange={(v) => set("availabilityStatus", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="limited">
                      Limited availability
                    </SelectItem>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Hourly rate (₦)">
                <Input
                  type="number"
                  min={0}
                  value={profile.hourlyRate ?? ""}
                  onChange={(e) => set("hourlyRate", e.target.value)}
                />
              </Field>
              <Field label="Starting project price (₦)">
                <Input
                  type="number"
                  min={0}
                  value={profile.startingPrice ?? ""}
                  onChange={(e) => set("startingPrice", e.target.value)}
                />
              </Field>
              <Field label="Preferred contact method">
                <Select
                  value={profile.preferredContactMethod}
                  onValueChange={(v) => set("preferredContactMethod", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Contact email">
                <Input
                  type="email"
                  value={profile.contactEmail}
                  onChange={(e) => set("contactEmail", e.target.value)}
                />
              </Field>
              <Field label="Contact phone">
                <Input
                  value={profile.contactPhone}
                  onChange={(e) => set("contactPhone", e.target.value)}
                />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="career" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <StructuredListEditor
                title="Work experience"
                items={profile.workExperience || []}
                onChange={(v) => set("workExperience", v)}
                fields={[
                  { key: "title", label: "Role/title" },
                  { key: "organization", label: "Company/client" },
                  { key: "location", label: "Location" },
                  { key: "startDate", label: "Start date", type: "date" },
                  { key: "endDate", label: "End date", type: "date" },
                  {
                    key: "description",
                    label: "Description",
                    type: "textarea",
                    wide: true,
                  },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <StructuredListEditor
                title="Education"
                items={profile.education || []}
                onChange={(v) => set("education", v)}
                fields={[
                  { key: "school", label: "School" },
                  { key: "qualification", label: "Qualification" },
                  { key: "field", label: "Field of study" },
                  { key: "startDate", label: "Start date", type: "date" },
                  { key: "endDate", label: "End date", type: "date" },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <StructuredListEditor
                title="Certifications"
                items={profile.certifications || []}
                onChange={(v) => set("certifications", v)}
                fields={[
                  { key: "name", label: "Certification" },
                  { key: "issuer", label: "Issuer" },
                  { key: "issueDate", label: "Issue date", type: "date" },
                  {
                    key: "credentialUrl",
                    label: "Credential URL",
                    type: "url",
                  },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="links">
          <Card>
            <CardHeader>
              <CardTitle>Social and freelancing platforms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {SOCIAL_PLATFORMS.map((platform) => {
                const link = links.find((l) => l.platform === platform) || {
                  platform,
                  profileUrl: "",
                  isVisible: true,
                };
                return (
                  <div
                    key={platform}
                    className="grid items-end gap-3 sm:grid-cols-[160px_1fr_auto]"
                  >
                    <Label className="capitalize">
                      {platform === "freelancer" ? "Freelancer.com" : platform}
                    </Label>
                    <Input
                      type="url"
                      placeholder="https://…"
                      value={link.profileUrl}
                      onChange={(e) =>
                        setLinks((current) => [
                          ...current.filter((l) => l.platform !== platform),
                          { ...link, profileUrl: e.target.value },
                        ])
                      }
                    />
                    <Switch
                      checked={link.isVisible}
                      onCheckedChange={(checked) =>
                        setLinks((current) => [
                          ...current.filter((l) => l.platform !== platform),
                          { ...link, isVisible: checked },
                        ])
                      }
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="portfolio">
          <Card>
            <CardContent className="p-6">
              <PortfolioEditor projects={projects} onRefresh={load} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Profile and privacy controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Public profile</p>
                  <p className="text-sm text-muted-foreground">
                    Allow clients with your link to view your profile.
                  </p>
                </div>
                <Switch
                  checked={profile.profileVisibility === "public"}
                  onCheckedChange={(v) =>
                    set("profileVisibility", v ? "public" : "private")
                  }
                />
              </div>
              {Object.entries({
                location: "Location",
                hourlyRate: "Rates",
                phone: "Phone number",
                email: "Email address",
                socialLinks: "Social links",
                workExperience: "Work experience",
                education: "Education",
                availability: "Availability",
              }).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label>{label}</Label>
                  <Switch
                    checked={Boolean(profile.visibility?.[key])}
                    onCheckedChange={(v) =>
                      set("visibility", { ...profile.visibility, [key]: v })
                    }
                  />
                </div>
              ))}
              <p className="rounded-lg bg-muted p-3 text-sm">
                Email and phone are hidden by default. Turning them on makes
                them visible on your public profile.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="verification">
          <VerificationApplication />
        </TabsContent>
      </Tabs>
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function CommaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <Field label={label}>
      <Input
        value={(value || []).join(", ")}
        onChange={(e) => onChange(comma(e.target.value))}
      />
      <p className="text-xs text-muted-foreground">
        Separate items with commas.
      </p>
    </Field>
  );
}
