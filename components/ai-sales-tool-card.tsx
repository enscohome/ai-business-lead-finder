"use client";

import * as React from "react";
import { FileText, MessageSquare, Phone, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/copy-button";
import { AISalesTool } from "@/types";
import { cn } from "@/lib/utils";

interface AISalesToolCardProps {
  tool: AISalesTool;
}

export function AISalesToolCard({ tool }: AISalesToolCardProps) {
  const getIcon = () => {
    switch (tool.type) {
      case "website_pitch":
        return FileText;
      case "whatsapp_message":
        return MessageSquare;
      case "cold_call_script":
        return Phone;
      case "follow_up":
        return Mail;
    }
  };

  const getColor = () => {
    switch (tool.type) {
      case "website_pitch":
        return "text-blue-600 bg-blue-500/10";
      case "whatsapp_message":
        return "text-green-600 bg-green-500/10";
      case "cold_call_script":
        return "text-amber-600 bg-amber-500/10";
      case "follow_up":
        return "text-purple-600 bg-purple-500/10";
    }
  };

  const Icon = getIcon();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", getColor())}>
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
