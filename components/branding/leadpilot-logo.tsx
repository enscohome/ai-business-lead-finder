import Image from "next/image";
import { cn } from "@/lib/utils";

const logoSizes = {
  compact: 28,
  standard: 36,
  large: 48,
} as const;

export type LeadPilotLogoSize = keyof typeof logoSizes;

interface LeadPilotLogoProps {
  size?: LeadPilotLogoSize;
  className?: string;
  priority?: boolean;
}

export function LeadPilotLogo({
  size = "standard",
  className,
  priority = false,
}: LeadPilotLogoProps) {
  const pixels = logoSizes[size];

  return (
    <Image
      src="/brand/leadpilot-logo.png"
      alt="LeadPilot AI logo"
      width={pixels}
      height={pixels}
      priority={priority}
      sizes={`${pixels}px`}
      className={cn("shrink-0 rounded-lg object-contain", className)}
    />
  );
}
