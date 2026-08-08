"use client";

import type { AutomationRequirements } from "@/types/automation-workflow";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function Field({
  label,
  children,
  optional,
}: {
  label: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {optional && (
          <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
        )}
      </Label>
      {children}
    </div>
  );
}

export function RequirementsPanel({
  value,
  onChange,
  disabled,
}: {
  value: AutomationRequirements;
  onChange: (value: AutomationRequirements) => void;
  disabled?: boolean;
}) {
  const update = <K extends keyof AutomationRequirements>(
    key: K,
    next: AutomationRequirements[K],
  ) => onChange({ ...value, [key]: next });
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Field label="Project name">
          <Input
            value={value.projectName}
            disabled={disabled}
            maxLength={120}
            onChange={(event) => update("projectName", event.target.value)}
          />
        </Field>
        <Field label="Client or business name" optional>
          <Input
            value={value.clientName}
            disabled={disabled}
            maxLength={120}
            onChange={(event) => update("clientName", event.target.value)}
          />
        </Field>
        <Field label="Business type">
          <Input
            value={value.businessType}
            disabled={disabled}
            maxLength={120}
            onChange={(event) => update("businessType", event.target.value)}
          />
        </Field>
        <Field label="n8n version" optional>
          <Input
            value={value.n8nVersion}
            disabled={disabled}
            maxLength={80}
            placeholder="For example: 1.100 or latest cloud"
            onChange={(event) => update("n8nVersion", event.target.value)}
          />
        </Field>
      </div>
      <Field label="Customer problem">
        <Textarea
          value={value.customerProblem}
          disabled={disabled}
          maxLength={3000}
          className="min-h-24"
          onChange={(event) => update("customerProblem", event.target.value)}
        />
      </Field>
      <Field label="Current manual process">
        <Textarea
          value={value.currentManualProcess}
          disabled={disabled}
          maxLength={3000}
          onChange={(event) => update("currentManualProcess", event.target.value)}
        />
      </Field>
      <Field label="Desired result">
        <Textarea
          value={value.desiredResult}
          disabled={disabled}
          maxLength={2000}
          onChange={(event) => update("desiredResult", event.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Field label="Trigger">
          <Textarea
            value={value.trigger}
            disabled={disabled}
            maxLength={800}
            onChange={(event) => update("trigger", event.target.value)}
          />
        </Field>
        <Field label="Input data">
          <Textarea
            value={value.inputData}
            disabled={disabled}
            maxLength={2000}
            onChange={(event) => update("inputData", event.target.value)}
          />
        </Field>
      </div>
      <Field label="Applications involved">
        <Input
          value={value.applications.join(", ")}
          disabled={disabled}
          placeholder="Gmail, Google Sheets, Telegram"
          onChange={(event) =>
            update(
              "applications",
              event.target.value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            )
          }
        />
      </Field>
      <Field label="Actions required">
        <Textarea
          value={value.actionsRequired}
          disabled={disabled}
          maxLength={3000}
          className="min-h-24"
          onChange={(event) => update("actionsRequired", event.target.value)}
        />
      </Field>
      <Field label="Conditions or decision rules" optional>
        <Textarea
          value={value.conditions}
          disabled={disabled}
          maxLength={2000}
          onChange={(event) => update("conditions", event.target.value)}
        />
      </Field>
      <Field label="Desired output">
        <Textarea
          value={value.desiredOutput}
          disabled={disabled}
          maxLength={2000}
          onChange={(event) => update("desiredOutput", event.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Field label="Schedule or frequency" optional>
          <Input
            value={value.schedule}
            disabled={disabled}
            maxLength={500}
            onChange={(event) => update("schedule", event.target.value)}
          />
        </Field>
        <Field label="Expected executions" optional>
          <Input
            value={value.expectedExecutions}
            disabled={disabled}
            maxLength={300}
            onChange={(event) =>
              update("expectedExecutions", event.target.value)
            }
          />
        </Field>
      </div>
      <Field label="Error handling">
        <Textarea
          value={value.errorHandling}
          disabled={disabled}
          maxLength={1500}
          onChange={(event) => update("errorHandling", event.target.value)}
        />
      </Field>
      <Field label="Notification requirements" optional>
        <Textarea
          value={value.notifications}
          disabled={disabled}
          maxLength={1500}
          onChange={(event) => update("notifications", event.target.value)}
        />
      </Field>
      <Field label="Human approval" optional>
        <Textarea
          value={value.humanApproval}
          disabled={disabled}
          maxLength={800}
          onChange={(event) => update("humanApproval", event.target.value)}
        />
      </Field>
      <Field label="Sample data" optional>
        <Textarea
          value={value.sampleData}
          disabled={disabled}
          maxLength={3000}
          className="font-mono text-xs"
          placeholder="Use synthetic examples only. Never paste credentials or real customer secrets."
          onChange={(event) => update("sampleData", event.target.value)}
        />
      </Field>
    </div>
  );
}
