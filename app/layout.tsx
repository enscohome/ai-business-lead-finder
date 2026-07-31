import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";

const inter = Inter({ subsets: ["latin"] });
const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL || "https://leadpilot.ai";

export const metadata: Metadata = {
  title: {
    default: "LeadPilot AI",
    template: "%s | LeadPilot AI",
  },
  description: "AI-powered business discovery platform for freelancers and agencies. Find local businesses that need websites, AI automation, and digital transformation.",
  keywords: ["lead finder", "business leads", "sales outreach", "AI automation", "freelancer tools", "agency software", "local business search"],
  authors: [{ name: "LeadPilot AI" }],
  creator: "LeadPilot AI",
  metadataBase: new URL(publicAppUrl),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: publicAppUrl,
    title: "LeadPilot AI",
    description: "Discover local businesses and generate AI-powered sales outreach",
    siteName: "LeadPilot AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "LeadPilot AI",
    description: "AI-powered business discovery for freelancers and agencies",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
