"use client";
import * as React from "react";
import { Copy, Facebook, Linkedin, Mail, Share2, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
export function ShareProfile({ name, title }: { name: string; title: string }) {
  const [copied, setCopied] = React.useState(false);
  const share = (network: string) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`${name} — ${title} on LeadPilot AI`);
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      email: `mailto:?subject=${text}&body=${url}`,
    };
    window.open(urls[network], "_blank", "noopener,noreferrer");
  };
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        onClick={async () => {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
        }}
      >
        <Copy className="mr-2 h-4 w-4" />
        {copied ? "Copied" : "Copy profile link"}
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => share("whatsapp")}
        aria-label="Share on WhatsApp"
      >
        <Share2 className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => share("linkedin")}
        aria-label="Share on LinkedIn"
      >
        <Linkedin className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => share("facebook")}
        aria-label="Share on Facebook"
      >
        <Facebook className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => share("twitter")}
        aria-label="Share on X"
      >
        <Twitter className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => share("email")}
        aria-label="Share by email"
      >
        <Mail className="h-4 w-4" />
      </Button>
    </div>
  );
}
