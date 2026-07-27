import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "AI Business Lead Finder",
    template: "%s | LeadFinder",
  },
  description: "AI-powered business discovery platform for freelancers and agencies. Find local businesses that need websites, AI automation, and digital transformation.",
  keywords: ["lead finder", "business leads", "sales outreach", "AI automation", "freelancer tools", "agency software", "local business search"],
  authors: [{ name: "LeadFinder" }],
  creator: "LeadFinder",
  metadataBase: new URL("https://leadfinder.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://leadfinder.app",
    title: "AI Business Lead Finder",
    description: "Discover local businesses and generate AI-powered sales outreach",
    siteName: "LeadFinder",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Business Lead Finder",
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
