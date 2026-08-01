import {
  BriefcaseBusiness,
  Dribbble,
  Github,
  Globe,
  Instagram,
  Linkedin,
  MessageCircle,
  Palette,
  Twitter,
  Youtube,
} from "lucide-react";
const icons: Record<string, typeof Globe> = {
  linkedin: Linkedin,
  github: Github,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  whatsapp: MessageCircle,
  dribbble: Dribbble,
  behance: Palette,
  fiverr: BriefcaseBusiness,
  upwork: BriefcaseBusiness,
  freelancer: BriefcaseBusiness,
  website: Globe,
};
const labels: Record<string, string> = {
  linkedin: "LinkedIn",
  fiverr: "Fiverr",
  upwork: "Upwork",
  freelancer: "Freelancer.com",
  github: "GitHub",
  behance: "Behance",
  dribbble: "Dribbble",
  website: "Personal website",
  instagram: "Instagram",
  twitter: "X / Twitter",
  youtube: "YouTube",
  whatsapp: "WhatsApp Business",
};
export function PlatformLink({
  platform,
  url,
}: {
  platform: string;
  url: string;
}) {
  const Icon = icons[platform] || Globe;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-accent"
    >
      <Icon className="h-4 w-4" />
      {labels[platform] || platform}
    </a>
  );
}
