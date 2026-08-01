import { BadgeCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
export function VerificationBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex items-center text-primary"
            aria-label="LeadPilot verified"
          >
            <BadgeCheck className="h-5 w-5 fill-primary text-primary-foreground" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Identity or professional information reviewed by LeadPilot AI.</p>
          <p className="text-xs text-muted-foreground">
            LeadPilot AI does not guarantee a freelancer&apos;s work.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
