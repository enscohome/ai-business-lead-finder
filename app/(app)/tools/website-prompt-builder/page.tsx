"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  History,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  DESIGN_STYLES,
  TECH_REQUIREMENTS,
  TECHNOLOGIES,
  WEBSITE_FEATURES,
  WEBSITE_PAGES,
  WEBSITE_PURPOSES,
} from "@/lib/website-prompt-options";
import type {
  PromptOutputs,
  PromptTarget,
  WebsitePromptFormData,
} from "@/types/website-prompt";
import { findSecretFields } from "@/lib/website-prompt";
import { useWebsitePromptAccess } from "@/components/website-prompt/access-gate";

const emptyForm: WebsitePromptFormData = {
  projectName: "",
  businessName: "",
  industry: "",
  businessDescription: "",
  productsServices: "",
  targetCustomers: "",
  countryCode: "NG",
  city: "",
  existingWebsiteUrl: "",
  websitePurpose: [],
  otherPurpose: "",
  selectedPages: ["Home", "About", "Contact"],
  customPages: [],
  selectedFeatures: [],
  customFeatures: [],
  designPreferences: {
    preferredColours: "",
    coloursToAvoid: "",
    style: [],
    fontPreference: "",
    appearance: "system",
    logoAvailability: "no",
    preferredLayout: "",
    exampleWebsites: "",
    brandFeeling: "",
  },
  technicalPreferences: {
    technologies: ["No preference"],
    requirements: [
      "Mobile responsiveness",
      "SEO",
      "Accessibility",
      "Security controls",
    ],
  },
  contactInformation: {
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    socialLinks: "",
    openingHours: "",
  },
};
const blankOutputs: PromptOutputs = {
  codex: "",
  claude: "",
  kimi: "",
  general: "",
};
const steps = [
  "Business details",
  "Website purpose",
  "Pages needed",
  "Features needed",
  "Design preferences",
  "Technical preferences",
  "Contact information",
];

function ChoiceGrid({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((option) => {
        const checked = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() =>
              onChange(
                checked
                  ? selected.filter((item) => item !== option)
                  : [...selected, option],
              )
            }
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition",
              checked
                ? "border-primary bg-primary/10 text-primary"
                : "hover:bg-accent",
            )}
            aria-pressed={checked}
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                checked && "border-primary bg-primary text-primary-foreground",
              )}
            >
              {checked && <Check className="h-3 w-3" />}
            </span>
            {option}
          </button>
        );
      })}
    </div>
  );
}

function Field({
  label,
  required,
  children,
  error,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function splitCustom(value: string) {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export default function WebsitePromptBuilderPage() {
  const { showAccessModal, showLimitModal } = useWebsitePromptAccess();
  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState<WebsitePromptFormData>(emptyForm);
  const [outputs, setOutputs] = React.useState<PromptOutputs>(blankOutputs);
  const [target, setTarget] = React.useState<PromptTarget>("codex");
  const [projectId, setProjectId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [secretFields, setSecretFields] = React.useState<string[]>([]);
  const secretError = (path: string) =>
    secretFields.some(
      (field) =>
        field === path ||
        field.startsWith(`${path}[`) ||
        field.startsWith(`${path}.`),
    )
      ? "Remove the secret or credential-like value from this field."
      : undefined;
  const validateSecrets = () => {
    const fields = [
      ...findSecretFields(form),
      ...findSecretFields(outputs, "outputs"),
    ];
    setSecretFields(fields);
    if (fields.length) {
      setError(
        "Remove secret or credential-like information before continuing.",
      );
      return false;
    }
    return true;
  };

  React.useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("project");
    if (!id) return;
    setLoading(true);
    fetch(`/api/website-prompt-builder/projects/${encodeURIComponent(id)}`)
      .then(async (response) => ({
        ok: response.ok,
        data: await response.json(),
      }))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || "Could not open this project.");
        setProjectId(data.project.id);
        setForm(data.project.form_data);
        setOutputs({ ...blankOutputs, ...data.project.prompt_outputs });
        setTarget(data.project.target_ai || "codex");
      })
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof WebsitePromptFormData>(
    key: K,
    value: WebsitePromptFormData[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const design = <K extends keyof WebsitePromptFormData["designPreferences"]>(
    key: K,
    value: WebsitePromptFormData["designPreferences"][K],
  ) =>
    setForm((current) => ({
      ...current,
      designPreferences: { ...current.designPreferences, [key]: value },
    }));
  const technical = <
    K extends keyof WebsitePromptFormData["technicalPreferences"],
  >(
    key: K,
    value: WebsitePromptFormData["technicalPreferences"][K],
  ) =>
    setForm((current) => ({
      ...current,
      technicalPreferences: { ...current.technicalPreferences, [key]: value },
    }));
  const contact = <K extends keyof WebsitePromptFormData["contactInformation"]>(
    key: K,
    value: WebsitePromptFormData["contactInformation"][K],
  ) =>
    setForm((current) => ({
      ...current,
      contactInformation: { ...current.contactInformation, [key]: value },
    }));

  const save = async (
    status: "draft" | "generated" = outputs.codex ? "generated" : "draft",
  ) => {
    if (!validateSecrets()) return null;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(
        projectId
          ? `/api/website-prompt-builder/projects/${projectId}`
          : "/api/website-prompt-builder/projects",
        {
          method: projectId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formData: form,
            outputs,
            targetAi: target,
            status,
          }),
        },
      );
      const data = await response.json();
      if (data.code === "SECRET_DETECTED") setSecretFields(data.fields || []);
      if (
        [
          "PREMIUM_REQUIRED",
          "SUBSCRIPTION_EXPIRED",
          "PAYMENT_FAILED",
          "ACCOUNT_SUSPENDED",
          "COUNTRY_UNAVAILABLE",
        ].includes(data.code)
      ) {
        showAccessModal(data.code, data.entitlement);
        return null;
      }
      if (!response.ok)
        throw new Error(data.error || "Could not save this project.");
      setProjectId(data.project.id);
      setSuccess(status === "draft" ? "Draft saved." : "Website prompt saved.");
      return data.project.id as string;
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not save this project.",
      );
      return null;
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    if (!validateSecrets()) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/website-prompt-builder/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: form }),
      });
      const data = await response.json();
      if (data.code === "SECRET_DETECTED") setSecretFields(data.fields || []);
      if (data.code === "MONTHLY_LIMIT_REACHED") {
        showLimitModal(data.entitlement);
        return;
      }
      if (
        [
          "PREMIUM_REQUIRED",
          "SUBSCRIPTION_EXPIRED",
          "PAYMENT_FAILED",
          "ACCOUNT_SUSPENDED",
          "COUNTRY_UNAVAILABLE",
        ].includes(data.code)
      ) {
        showAccessModal(data.code, data.entitlement);
        return;
      }
      if (!response.ok)
        throw new Error(data.error || "Could not generate the prompts.");
      setOutputs(data.outputs);
      setSuccess(
        data.source === "openai"
          ? "Four tailored outputs generated."
          : "Four structured outputs generated. AI polishing was unavailable, so no business facts were invented.",
      );
      setTimeout(
        () =>
          document
            .getElementById("prompt-output")
            ?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not generate the prompts.",
      );
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(outputs[target]);
    setSuccess("Copied to clipboard.");
  };
  const download = () => {
    const blob = new Blob([outputs[target]], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(form.projectName || "website-prompt").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${target}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <span className="ml-3">Opening project…</span>
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            LeadPilot AI tool
          </div>
          <h1 className="text-3xl font-bold">Website Prompt Builder</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Turn your business idea into detailed prompts for Codex, Claude,
            Kimi, or a developer-ready brief.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/tools/website-prompt-builder/history">
            <History className="mr-2 h-4 w-4" />
            My Website Prompts
          </Link>
        </Button>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
          {/limit/i.test(error) && (
            <Link className="ml-2 underline" href="/pricing">
              View plans
            </Link>
          )}
        </div>
      )}
      {success && (
        <div
          role="status"
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
        >
          {success}
        </div>
      )}
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-[700px] gap-2">
          {steps.map((name, index) => (
            <button
              type="button"
              key={name}
              onClick={() => setStep(index)}
              className={cn(
                "flex flex-1 items-center gap-2 rounded-lg border p-2 text-left text-xs",
                index === step
                  ? "border-primary bg-primary/10 text-primary"
                  : index < step
                    ? "border-emerald-500/30"
                    : "text-muted-foreground",
              )}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">
                {index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              {name}
            </button>
          ))}
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            Step {step + 1}: {steps[step]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {step === 0 && (
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Project name"
                required
                error={secretError("projectName")}
              >
                <Input
                  maxLength={120}
                  value={form.projectName}
                  onChange={(event) =>
                    update("projectName", event.target.value)
                  }
                  placeholder="My business website"
                />
              </Field>
              <Field
                label="Business name"
                required
                error={secretError("businessName")}
              >
                <Input
                  maxLength={120}
                  value={form.businessName}
                  onChange={(event) =>
                    update("businessName", event.target.value)
                  }
                />
              </Field>
              <Field
                label="Business type or industry"
                required
                error={secretError("industry")}
              >
                <Input
                  maxLength={120}
                  value={form.industry}
                  onChange={(event) => update("industry", event.target.value)}
                  placeholder="e.g. Fashion retail"
                />
              </Field>
              <Field label="Country">
                <Input value="Nigeria" disabled />
              </Field>
              <Field
                label="Short business description"
                required
                error={secretError("businessDescription")}
              >
                <Textarea
                  maxLength={2500}
                  value={form.businessDescription}
                  onChange={(event) =>
                    update("businessDescription", event.target.value)
                  }
                />
              </Field>
              <Field
                label="Main products or services"
                required
                error={secretError("productsServices")}
              >
                <Textarea
                  maxLength={2500}
                  value={form.productsServices}
                  onChange={(event) =>
                    update("productsServices", event.target.value)
                  }
                />
              </Field>
              <Field
                label="Target customers"
                required
                error={secretError("targetCustomers")}
              >
                <Textarea
                  maxLength={2500}
                  value={form.targetCustomers}
                  onChange={(event) =>
                    update("targetCustomers", event.target.value)
                  }
                />
              </Field>
              <div className="space-y-5">
                <Field
                  label="City or service area (optional)"
                  error={secretError("city")}
                >
                  <Input
                    maxLength={120}
                    value={form.city}
                    onChange={(event) => update("city", event.target.value)}
                  />
                </Field>
                <Field
                  label="Existing website URL (optional)"
                  error={secretError("existingWebsiteUrl")}
                >
                  <Input
                    type="url"
                    maxLength={500}
                    value={form.existingWebsiteUrl}
                    onChange={(event) =>
                      update("existingWebsiteUrl", event.target.value)
                    }
                    placeholder="https://example.com"
                  />
                </Field>
              </div>
            </div>
          )}
          {step === 1 && (
            <>
              <ChoiceGrid
                options={WEBSITE_PURPOSES}
                selected={form.websitePurpose}
                onChange={(items) => update("websitePurpose", items)}
              />
              <Field
                label="Other purpose (optional)"
                error={secretError("otherPurpose")}
              >
                <Input
                  maxLength={600}
                  value={form.otherPurpose}
                  onChange={(event) =>
                    update("otherPurpose", event.target.value)
                  }
                />
              </Field>
            </>
          )}
          {step === 2 && (
            <>
              <ChoiceGrid
                options={WEBSITE_PAGES}
                selected={form.selectedPages}
                onChange={(items) => update("selectedPages", items)}
              />
              <Field
                label="Custom page names (comma or line separated)"
                error={secretError("customPages")}
              >
                <Textarea
                  value={form.customPages.join(", ")}
                  onChange={(event) =>
                    update("customPages", splitCustom(event.target.value))
                  }
                  placeholder="Case Studies, Our Team"
                />
              </Field>
            </>
          )}
          {step === 3 && (
            <>
              <ChoiceGrid
                options={WEBSITE_FEATURES}
                selected={form.selectedFeatures}
                onChange={(items) => update("selectedFeatures", items)}
              />
              <Field
                label="Other custom features (comma or line separated)"
                error={secretError("customFeatures")}
              >
                <Textarea
                  value={form.customFeatures.join(", ")}
                  onChange={(event) =>
                    update("customFeatures", splitCustom(event.target.value))
                  }
                />
              </Field>
            </>
          )}
          {step === 4 && (
            <div className="space-y-5">
              <ChoiceGrid
                options={DESIGN_STYLES}
                selected={form.designPreferences.style}
                onChange={(items) => design("style", items)}
              />
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Preferred colours"
                  error={secretError("designPreferences.preferredColours")}
                >
                  <Input
                    maxLength={600}
                    value={form.designPreferences.preferredColours}
                    onChange={(e) => design("preferredColours", e.target.value)}
                  />
                </Field>
                <Field
                  label="Colours to avoid"
                  error={secretError("designPreferences.coloursToAvoid")}
                >
                  <Input
                    maxLength={600}
                    value={form.designPreferences.coloursToAvoid}
                    onChange={(e) => design("coloursToAvoid", e.target.value)}
                  />
                </Field>
                <Field
                  label="Font preference (optional)"
                  error={secretError("designPreferences.fontPreference")}
                >
                  <Input
                    maxLength={600}
                    value={form.designPreferences.fontPreference}
                    onChange={(e) => design("fontPreference", e.target.value)}
                  />
                </Field>
                <Field label="Appearance">
                  <select
                    className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={form.designPreferences.appearance}
                    onChange={(e) =>
                      design("appearance", e.target.value as any)
                    }
                  >
                    <option value="system">Light and dark / system</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </Field>
                <Field label="Logo availability">
                  <select
                    className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={form.designPreferences.logoAvailability}
                    onChange={(e) =>
                      design("logoAvailability", e.target.value as any)
                    }
                  >
                    <option value="yes">Logo available</option>
                    <option value="in-progress">Logo in progress</option>
                    <option value="no">No logo yet</option>
                  </select>
                </Field>
                <Field
                  label="Preferred layout"
                  error={secretError("designPreferences.preferredLayout")}
                >
                  <Input
                    maxLength={600}
                    value={form.designPreferences.preferredLayout}
                    onChange={(e) => design("preferredLayout", e.target.value)}
                  />
                </Field>
                <Field
                  label="Example websites (optional)"
                  error={secretError("designPreferences.exampleWebsites")}
                >
                  <Textarea
                    maxLength={1000}
                    value={form.designPreferences.exampleWebsites}
                    onChange={(e) => design("exampleWebsites", e.target.value)}
                  />
                </Field>
                <Field
                  label="Desired brand feeling"
                  error={secretError("designPreferences.brandFeeling")}
                >
                  <Textarea
                    maxLength={600}
                    value={form.designPreferences.brandFeeling}
                    onChange={(e) => design("brandFeeling", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <Label className="mb-3 block">Technology preferences</Label>
                <ChoiceGrid
                  options={TECHNOLOGIES}
                  selected={form.technicalPreferences.technologies}
                  onChange={(items) => technical("technologies", items)}
                />
              </div>
              <div>
                <Label className="mb-3 block">Technical requirements</Label>
                <ChoiceGrid
                  options={TECH_REQUIREMENTS}
                  selected={form.technicalPreferences.requirements}
                  onChange={(items) => technical("requirements", items)}
                />
              </div>
            </div>
          )}
          {step === 6 && (
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Phone number"
                error={secretError("contactInformation.phone")}
              >
                <Input
                  maxLength={40}
                  value={form.contactInformation.phone}
                  onChange={(e) => contact("phone", e.target.value)}
                />
              </Field>
              <Field
                label="WhatsApp number"
                error={secretError("contactInformation.whatsapp")}
              >
                <Input
                  maxLength={40}
                  value={form.contactInformation.whatsapp}
                  onChange={(e) => contact("whatsapp", e.target.value)}
                />
              </Field>
              <Field
                label="Business email"
                error={secretError("contactInformation.email")}
              >
                <Input
                  type="email"
                  maxLength={180}
                  value={form.contactInformation.email}
                  onChange={(e) => contact("email", e.target.value)}
                />
              </Field>
              <Field
                label="Address"
                error={secretError("contactInformation.address")}
              >
                <Input
                  maxLength={500}
                  value={form.contactInformation.address}
                  onChange={(e) => contact("address", e.target.value)}
                />
              </Field>
              <Field
                label="Social links"
                error={secretError("contactInformation.socialLinks")}
              >
                <Textarea
                  maxLength={1500}
                  value={form.contactInformation.socialLinks}
                  onChange={(e) => contact("socialLinks", e.target.value)}
                />
              </Field>
              <Field
                label="Opening hours"
                error={secretError("contactInformation.openingHours")}
              >
                <Textarea
                  maxLength={500}
                  value={form.contactInformation.openingHours}
                  onChange={(e) => contact("openingHours", e.target.value)}
                />
              </Field>
            </div>
          )}
          <div className="flex flex-col-reverse justify-between gap-3 border-t pt-5 sm:flex-row">
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={step === 0 || busy}
                onClick={() => setStep((value) => value - 1)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => save("draft")}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Draft
              </Button>
            </div>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep((value) => value + 1)}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button disabled={busy} onClick={generate}>
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Prompt
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {outputs.codex && (
        <Card id="prompt-output">
          <CardHeader>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <CardTitle>Generated outputs</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={copy}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
                <Button size="sm" variant="outline" onClick={download}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button
                  size="sm"
                  onClick={() => save("generated")}
                  disabled={busy}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generate}
                  disabled={busy}
                >
                  Regenerate
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs
              value={target}
              onValueChange={(value) => setTarget(value as PromptTarget)}
            >
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-4">
                <TabsTrigger value="codex">Codex Prompt</TabsTrigger>
                <TabsTrigger value="claude">Claude Prompt</TabsTrigger>
                <TabsTrigger value="kimi">Kimi Prompt</TabsTrigger>
                <TabsTrigger value="general">General Brief</TabsTrigger>
              </TabsList>
              {(["codex", "claude", "kimi", "general"] as PromptTarget[]).map(
                (key) => (
                  <TabsContent key={key} value={key}>
                    <Textarea
                      aria-label={`${key} output editor`}
                      className="min-h-[520px] font-mono text-sm leading-relaxed"
                      value={outputs[key]}
                      onChange={(event) =>
                        setOutputs((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                    />
                    {secretError(`outputs.${key}`) && (
                      <p className="mt-2 text-xs text-destructive" role="alert">
                        {secretError(`outputs.${key}`)}
                      </p>
                    )}
                  </TabsContent>
                ),
              )}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
