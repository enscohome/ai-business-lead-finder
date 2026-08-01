import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LeadPilot AI — Find & Close Local Clients",
  description: "AI-powered business discovery platform for freelancers and agencies. Find local businesses that need websites, AI automation, and digital transformation.",
  keywords: ["lead finder", "business leads", "sales outreach", "AI automation", "freelancer tools", "agency software"],
  openGraph: {
    title: "LeadPilot AI",
    description: "Discover local businesses and generate AI-powered sales outreach",
    type: "website",
  },
};

export default function MarketingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
