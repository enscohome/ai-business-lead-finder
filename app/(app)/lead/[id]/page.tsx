"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Phone, MapPin, ExternalLink, Globe, 
  Star, Bookmark, MessageCircle, Copy, Check,
  Sparkles, Building2, Calendar, TrendingUp,
  Loader2, RefreshCw, Map
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Business, SavedLead, AISalesTool } from "@/types";
import { getOpportunityColor, formatPhoneNumber, generateId } from "@/lib/utils";
import { generateAllSalesTools } from "@/lib/ai-tools";
import { generateAllAItools } from "@/lib/openai";
import { cn } from "@/lib/utils";
import { savedLeadWithoutProviderSnapshot } from "@/lib/provider-data";
import { GoogleMapsAttribution } from "@/components/google-maps-attribution";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5">
      {copied ? <><Check className="h-4 w-4 text-emerald-500" /><span className="text-emerald-500">Copied!</span></>
       : <><Copy className="h-4 w-4" />Copy</>}
    </Button>
  );
}

function SalesToolCard({ tool }: { tool: AISalesTool }) {
  const icons = {
    website_pitch: Globe,
    whatsapp_message: MessageCircle,
    cold_call_script: Phone,
    follow_up: ExternalLink,
  };
  const colors = {
    website_pitch: "text-blue-600 bg-blue-500/10",
    whatsapp_message: "text-green-600 bg-green-500/10",
    cold_call_script: "text-amber-600 bg-amber-500/10",
    follow_up: "text-purple-600 bg-purple-500/10",
  };
  const Icon = icons[tool.type];
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", colors[tool.type])}>
              <Icon className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">{tool.title}</CardTitle>
          </div>
          <CopyButton text={tool.content} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="bg-muted/50 rounded-lg p-4 max-h-[400px] overflow-y-auto">
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground/90">
            {tool.content}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}

function GoogleMapEmbed({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const embedUrl = apiKey 
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${lat},${lng}&zoom=15`
    : `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;

  return (
    <div className="rounded-xl overflow-hidden border bg-muted/30 aspect-video">
      <iframe
        src={embedUrl}
        width="100%"
        height="100%"
        style={{ border: 0, minHeight: 300 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`Map of ${name}`}
      />
    </div>
  );
}

export default function LeadDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [business, setBusiness] = React.useState<Business | null>(null);
  const [savedLeads, setSavedLeads] = React.useState<SavedLead[]>([]);
  const [salesTools, setSalesTools] = React.useState<AISalesTool[]>([]);
  const [isSaved, setIsSaved] = React.useState(false);
  const [isLoadingAI, setIsLoadingAI] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const dataParam = searchParams.get("data");
    if (dataParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(dataParam));
        setBusiness(parsed);
      } catch {
        // Try to find in localStorage saved leads
        const leads = JSON.parse(localStorage.getItem("savedLeads") || "[]");
        const found = leads.find((l: SavedLead) => l.businessId === params.id);
        if (found) setBusiness(found.business);
      }
    } else {
      const leads = JSON.parse(localStorage.getItem("savedLeads") || "[]");
      const found = leads.find((l: SavedLead) => l.businessId === params.id);
      if (found) setBusiness(found.business);
    }

    const leads = JSON.parse(localStorage.getItem("savedLeads") || "[]");
    setSavedLeads(leads);
  }, [searchParams, params.id]);

  React.useEffect(() => {
    if (!business) return;

    setIsSaved(savedLeads.some((l) => l.businessId === business.id));

    // Load AI tools - try OpenAI first, fallback to templates
    const loadTools = async () => {
      setIsLoadingAI(true);
      setAiError(null);
      try {
        // Check if OpenAI API key is configured
        const hasOpenAI = !!process.env.NEXT_PUBLIC_OPENAI_ENABLED;
        if (hasOpenAI) {
          const tools = await generateAllAItools(business);
          setSalesTools(tools);
        } else {
          // Use template-based generation (no API key needed)
          const tools = generateAllSalesTools(business);
          setSalesTools(tools);
        }
      } catch (error) {
        console.error("AI generation failed:", error);
        setAiError("AI generation unavailable. Using template-based tools.");
        setSalesTools(generateAllSalesTools(business));
      } finally {
        setIsLoadingAI(false);
      }
    };

    loadTools();
  }, [business, savedLeads]);

  const handleSave = () => {
    if (!business) return;

    if (isSaved) {
      const updated = savedLeads.filter((l) => l.businessId !== business.id);
      setSavedLeads(updated);
      localStorage.setItem("savedLeads", JSON.stringify(updated));
      setIsSaved(false);
    } else {
      const newLead = savedLeadWithoutProviderSnapshot(business);
      const updated = [newLead, ...savedLeads];
      setSavedLeads(updated);
      localStorage.setItem("savedLeads", JSON.stringify(updated));
      setIsSaved(true);

      const activities = JSON.parse(localStorage.getItem("activities") || "[]");
      activities.unshift({
        id: generateId(),
        type: "save",
        description: `Saved ${business.name} as a lead`,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem("activities", JSON.stringify(activities.slice(0, 20)));
    }
  };

  const handleCall = () => {
    if (business) window.location.href = `tel:${business.phone}`;
  };

  const handleWhatsApp = () => {
    if (!business) return;
    const cleanPhone = business.phone.replace(/\D/g, "");
    window.open(`https://wa.me/234${cleanPhone.startsWith("0") ? cleanPhone.slice(1) : cleanPhone}`, "_blank");
  };

  const handleMaps = () => {
    if (business) window.open(business.googleMapsUrl, "_blank");
  };

  const handleRegenerateAI = async () => {
    if (!business) return;
    setIsLoadingAI(true);
    setAiError(null);
    try {
      const tools = generateAllSalesTools(business);
      setSalesTools(tools);
    } catch (error) {
      setAiError("Failed to regenerate. Please try again.");
    } finally {
      setIsLoadingAI(false);
    }
  };

  if (!business) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/search">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Search
        </Link>
      </Button>

      {/* Business Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">{business.name}</h1>
            <Badge variant="outline" className={cn("capitalize", getOpportunityColor(business.opportunityScore))}>
              <TrendingUp className="h-3 w-3 mr-1" />
              {business.opportunityScore} Opportunity
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{business.businessType}</Badge>
            <Badge variant="outline">{business.city}, {business.state}</Badge>
            {business.area && <Badge variant="outline">{business.area}</Badge>}
            {business.rating && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-medium">{business.rating}</span>
                <span className="text-muted-foreground">({business.reviewCount} reviews)</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant={isSaved ? "default" : "outline"} onClick={handleSave}>
            <Bookmark className={cn("h-4 w-4 mr-2", isSaved && "fill-current")} />
            {isSaved ? "Saved" : "Save Lead"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {business.source === "google_places" && <div className="lg:col-span-3"><GoogleMapsAttribution /></div>}
        {/* Left Column - Business Info */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Phone Number</p>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{formatPhoneNumber(business.phone)}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Address</p>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{business.address}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Website Status</p>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  {business.website ? (
                    <a href={business.website} target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1">
                      {business.websiteStatus === "modern" ? "Modern Website" : "Outdated Website"}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-red-500 font-medium">No Website Found</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Location</p>
                <Button variant="outline" className="w-full" onClick={handleMaps}>
                  <MapPin className="h-4 w-4 mr-2" />
                  View on Google Maps
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" onClick={handleCall}>
                <Phone className="h-4 w-4 mr-2" />
                Call Business
              </Button>
              <Button variant="outline" className="w-full" onClick={handleWhatsApp}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Send WhatsApp
              </Button>
            </CardContent>
          </Card>

          {/* Map */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Map className="h-5 w-5 text-primary" />
                Map Location
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <GoogleMapEmbed lat={business.latitude} lng={business.longitude} name={business.name} />
            </CardContent>
          </Card>

          {/* Opportunity Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Opportunity Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Website Presence</span>
                  <span className={cn("font-medium",
                    business.websiteStatus === "none" ? "text-red-500" : 
                    business.websiteStatus === "outdated" ? "text-amber-500" : "text-emerald-500"
                  )}>
                    {business.websiteStatus === "none" ? "Missing" : 
                     business.websiteStatus === "outdated" ? "Outdated" : "Modern"}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all",
                    business.websiteStatus === "none" ? "bg-red-500 w-[90%]" : 
                    business.websiteStatus === "outdated" ? "bg-amber-500 w-[60%]" : "bg-emerald-500 w-[20%]"
                  )} />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p className="font-medium mb-1">AI Opportunity Score: {business.opportunityScore.toUpperCase()}</p>
                <p className="text-muted-foreground mb-2">Service: {business.targetServiceLabel || "Digital services"}</p>
                <ul className="space-y-1 text-muted-foreground list-disc pl-4">
                  {(business.opportunityReasons?.length
                    ? business.opportunityReasons
                    : ["This score is based on the business's available website and listing signals."]
                  ).map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - AI Sales Tools */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">AI Sales Tools</h2>
            </div>
            <Button variant="outline" size="sm" onClick={handleRegenerateAI} disabled={isLoadingAI}>
              {isLoadingAI ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Regenerate
            </Button>
          </div>

          {aiError && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 text-sm mb-4">
              {aiError}
            </div>
          )}

          {isLoadingAI ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-3">
                    <div className="h-5 w-48 bg-muted rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-muted rounded" />
                      <div className="h-4 w-3/4 bg-muted rounded" />
                      <div className="h-4 w-1/2 bg-muted rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Tabs defaultValue="website_pitch" className="space-y-4">
              <TabsList className="grid grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="website_pitch">Website Pitch</TabsTrigger>
                <TabsTrigger value="whatsapp_message">WhatsApp</TabsTrigger>
                <TabsTrigger value="cold_call_script">Cold Call</TabsTrigger>
                <TabsTrigger value="follow_up">Follow-up</TabsTrigger>
              </TabsList>

              {salesTools.map((tool) => (
                <TabsContent key={tool.type} value={tool.type}>
                  <SalesToolCard tool={tool} />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
