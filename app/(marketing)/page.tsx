"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Zap, Search, Target, MessageSquare, BarChart3, Shield, 
  Check, ArrowRight, Star, MapPin, Phone, Globe,
  Users, Clock, Award, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const features = [
  {
    icon: Search,
    title: "Smart Business Discovery",
    description: "Search thousands of local businesses by type, city, and location. Find restaurants, hotels, salons, and more.",
    color: "text-blue-600 bg-blue-500/10",
  },
  {
    icon: Target,
    title: "AI Opportunity Scoring",
    description: "Instantly see which businesses need websites, redesigns, or AI automation with our intelligent scoring system.",
    color: "text-emerald-600 bg-emerald-500/10",
  },
  {
    icon: MessageSquare,
    title: "AI Sales Outreach",
    description: "Generate personalized website pitches, WhatsApp messages, cold call scripts, and follow-up emails in seconds.",
    color: "text-purple-600 bg-purple-500/10",
  },
  {
    icon: BarChart3,
    title: "Lead Pipeline Management",
    description: "Track leads from discovery to close. Add notes, update statuses, and never lose a prospect again.",
    color: "text-amber-600 bg-amber-500/10",
  },
  {
    icon: Shield,
    title: "Accurate Data",
    description: "Real business data with verified phone numbers, addresses, and website status — no guesswork.",
    color: "text-red-600 bg-red-500/10",
  },
  {
    icon: Clock,
    title: "Save Hours Every Week",
    description: "What used to take days of manual research now takes minutes. Focus on selling, not searching.",
    color: "text-cyan-600 bg-cyan-500/10",
  },
];

const testimonials = [
  {
    name: "Chidi Okafor",
    role: "Web Developer",
    company: "Lagos",
    text: "I found 15 restaurant clients in my first week. The AI pitch generator closed 4 deals. This tool paid for itself immediately.",
    rating: 5,
  },
  {
    name: "Amina Bello",
    role: "Digital Agency Owner",
    company: "Abuja",
    text: "We use LeadPilot AI daily to fuel our sales pipeline. The opportunity scoring helps us prioritize the hottest leads first.",
    rating: 5,
  },
  {
    name: "Emeka Nwosu",
    role: "Freelance Marketer",
    company: "Port Harcourt",
    text: "The WhatsApp outreach messages are incredibly effective. I have never had such high response rates from cold outreach.",
    rating: 5,
  },
];

const stats = [
  { value: "50,000+", label: "Businesses Indexed" },
  { value: "12", label: "Cities Covered" },
  { value: "30+", label: "Business Types" },
  { value: "98%", label: "Data Accuracy" },
];

export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled ? "bg-background/95 backdrop-blur-md border-b shadow-sm" : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">LeadPilot AI</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.push("/auth/login")}>
                Sign In
              </Button>
              <Button size="sm" onClick={() => router.push("/auth/signup")}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
              <Star className="h-3.5 w-3.5 mr-1.5 fill-amber-400 text-amber-400" />
              Trusted by 500+ freelancers and agencies
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6">
              Find Your Next{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                High-Value Client
              </span>
              {" "}in Minutes
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              AI-powered business discovery platform. Find local businesses that need websites, 
              AI automation, and digital transformation — then close them with AI-generated outreach.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-12 px-8 text-lg" onClick={() => router.push("/auth/signup")}>
                Start Free Trial
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-lg" onClick={() => router.push("/search")}>
                Try Demo Search
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">No credit card required. 20 free searches daily.</p>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl sm:text-4xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From search to close in three simple steps
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Search",
                description: "Enter a business type and city. We will find every matching business with contact details and digital presence analysis.",
                icon: Search,
              },
              {
                step: "02",
                title: "Score",
                description: "Our AI analyzes each business website status to calculate an opportunity score — High, Medium, or Low.",
                icon: Target,
              },
              {
                step: "03",
                title: "Close",
                description: "Use our AI-generated sales tools to craft the perfect pitch, then track your pipeline to closed deals.",
                icon: Award,
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="bg-card border rounded-2xl p-8 h-full hover:shadow-lg transition-shadow">
                  <span className="text-5xl font-bold text-muted-foreground/20">{item.step}</span>
                  <div className="mt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold">{item.title}</h3>
                    </div>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything You Need to Win Clients</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A complete toolkit for freelancers and agencies who sell digital services
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="hover:shadow-md transition-shadow border-0 bg-card">
                <CardContent className="p-6">
                  <div className={`inline-flex p-3 rounded-xl mb-4 ${feature.color}`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Preview */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4">Live Demo</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                See Exactly What You Are Getting
              </h2>
              <div className="space-y-4">
                {[
                  { icon: MapPin, text: "Real addresses and phone numbers for every business" },
                  { icon: Globe, text: "Instant website status detection (modern / outdated / none)" },
                  { icon: Phone, text: "One-click call and WhatsApp buttons" },
                  { icon: TrendingUp, text: "Visual opportunity scoring with clear reasoning" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-muted-foreground">{item.text}</span>
                  </div>
                ))}
              </div>
              <Button className="mt-8" size="lg" onClick={() => router.push("/search")}>
                Try a Demo Search
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl blur-2xl" />
              <div className="relative bg-card border rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-sm text-muted-foreground">Search Results</span>
                </div>
                <div className="space-y-3">
                  {[
                    { name: "Golden Kitchen", type: "Restaurant", score: "High", phone: "0803 123 4567" },
                    { name: "Royal Suites Hotel", type: "Hotel", score: "Medium", phone: "0805 987 6543" },
                    { name: "Divine Salon", type: "Salon", score: "High", phone: "0806 456 7890" },
                  ].map((biz) => (
                    <div key={biz.name} className="p-4 rounded-xl bg-muted/50 border">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{biz.name}</p>
                          <p className="text-xs text-muted-foreground">{biz.type} — Lagos</p>
                        </div>
                        <Badge variant={biz.score === "High" ? "default" : "secondary"} className="text-xs">
                          {biz.score} Opportunity
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{biz.phone}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 lg:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Loved by Freelancers & Agencies</h2>
            <p className="text-muted-foreground text-lg">See what our users are saying</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <Card key={t.name} className="border-0 bg-card">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 leading-relaxed">&quot;{t.text}&quot;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role} — {t.company}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground text-lg">Start free, upgrade when you are ready</p>
          </div>
          <div className="mx-auto max-w-2xl rounded-2xl border bg-card p-8 text-center shadow-sm">
            <p className="text-lg font-medium">Plans from ₦0, built for Nigerian freelancers, teams, and agencies.</p>
            <p className="mt-2 text-sm text-muted-foreground">Compare monthly search, lead, AI outreach, export, and team allowances on the dedicated pricing page.</p>
            <Button className="mt-6" onClick={() => router.push("/auth/signup")}>Create a free account to view plans</Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl p-12 border">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to Find Your Next Client?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Join 500+ freelancers and agencies who use LeadPilot AI to discover and close high-value clients every day.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-12 px-8 text-lg" onClick={() => router.push("/auth/signup")}>
                Get Started Free
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-lg" onClick={() => router.push("/search")}>
                Try Demo Search
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold">LeadPilot AI</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered business discovery for freelancers and agencies.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
                <li><Link href="/search" className="hover:text-foreground">Demo Search</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">About</a></li>
                <li><a href="#" className="hover:text-foreground">Blog</a></li>
                <li><a href="#" className="hover:text-foreground">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground">Terms</Link></li>
              </ul>
            </div>
          </div>
          <Separator className="mb-8" />
          <p className="text-sm text-muted-foreground text-center">
            © 2026 LeadPilot AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
