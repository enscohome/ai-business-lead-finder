import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const details = [
  ["Account type", "LeadPilot Owner"],
  ["Access", "Lifetime"],
  ["Usage", "Unlimited"],
  ["Renewal date", "Not required"],
] as const;

export function OwnerAccessSummary({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold">
          <Crown className="h-5 w-5 text-amber-500" />
          Lifetime owner access
        </div>
        <Badge className="bg-amber-500 text-amber-950 hover:bg-amber-500">
          Owner
        </Badge>
      </div>
      <dl
        className={compact ? "grid gap-3 text-sm" : "grid gap-4 sm:grid-cols-2"}
      >
        {details.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
