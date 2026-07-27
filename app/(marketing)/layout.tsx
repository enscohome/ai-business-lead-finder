import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Business Lead Finder — Find & Close Local Clients",
  description: "AI-powered business discovery platform for freelancers and agencies. Find local businesses that need websites, AI automation, and digital transformation.",
  keywords: ["lead finder", "business leads", "sales outreach", "AI automation", "freelancer tools", "agency software"],
  openGraph: {
    title: "AI Business Lead Finder",
    description: "Discover local businesses and generate AI-powered sales outreach",
    type: "website",
  },
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
