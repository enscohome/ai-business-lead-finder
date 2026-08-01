"use client";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
export interface FieldConfig {
  key: string;
  label: string;
  type?: string;
  wide?: boolean;
}
export function StructuredListEditor({
  title,
  items,
  fields,
  onChange,
}: {
  title: string;
  items: any[];
  fields: FieldConfig[];
  onChange: (items: any[]) => void;
}) {
  const set = (index: number, key: string, value: string) =>
    onChange(
      items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...items, { id: crypto.randomUUID() }])}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </div>
      {items.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Nothing added yet.
        </p>
      )}
      {items.map((item, index) => (
        <div
          key={item.id || index}
          className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2"
        >
          {fields.map((field) => (
            <div key={field.key} className={field.wide ? "sm:col-span-2" : ""}>
              <Label>{field.label}</Label>
              {field.type === "textarea" ? (
                <Textarea
                  value={item[field.key] || ""}
                  onChange={(e) => set(index, field.key, e.target.value)}
                />
              ) : (
                <Input
                  type={field.type || "text"}
                  value={item[field.key] || ""}
                  onChange={(e) => set(index, field.key, e.target.value)}
                />
              )}
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="justify-self-start text-red-600"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
}
