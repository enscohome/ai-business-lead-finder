import { BadgeCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
export function VerificationBadge({ className = "" }: { className?: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center text-blue-500 ${className}`}
            aria-label="LeadPilot Verified"
          >
            <BadgeCheck className="h-5 w-5 fill-blue-600 text-white" aria-hidden="true" />
            <span className="sr-only">LeadPilot Verified</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">LeadPilot Verified</p>
          <p>Identity or professional information reviewed by LeadPilot AI.</p>
          <p className="text-xs text-muted-foreground">
            LeadPilot AI does not guarantee a freelancer&apos;s work.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
