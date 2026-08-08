"use client";
import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Archive, ArrowLeft, Ban, LogOut, Send } from "lucide-react";
import { CommunityReportDialog } from "@/components/opportunities/report-dialog";
import { VerificationBadge } from "@/components/freelancer/verification-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function ConversationPage() {
  const id = useParams<{ conversationId: string }>().conversationId,
    router = useRouter();
  const [conversation, setConversation] = React.useState<any>(null),
    [messages, setMessages] = React.useState<any[]>([]),
    [currentUserId, setCurrentUserId] = React.useState(""),
    [draft, setDraft] = React.useState(""),
    [error, setError] = React.useState(""),
    [loading, setLoading] = React.useState(true),
    [busy, setBusy] = React.useState(false);
  const bottom = React.useRef<HTMLDivElement>(null);
  const load = React.useCallback(async () => {
    const response = await fetch(`/api/opportunities/conversations/${id}`);
    const data = await response.json();
    if (response.ok) {
      setConversation(data.conversation);
      setMessages(data.messages);
      setCurrentUserId(data.currentUserId);
    } else setError(data.error);
    setLoading(false);
  }, [id]);
  React.useEffect(() => {
    load();
  }, [load]);
  React.useEffect(() => {
    if (!currentUserId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`opportunity-conversation-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "opportunity_messages",
          filter: `conversation_id=eq.${id}`,
        },
        (event) => {
          const next = event.new as any;
          setMessages((current) =>
            current.some((item) => item.id === next.id)
              ? current
              : [...current, next],
          );
          if (next.sender_id !== currentUserId)
            void fetch(`/api/opportunities/conversations/${id}`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ action: "read" }),
            });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, id]);
  React.useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  const send = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true);
    const response = await fetch(
      `/api/opportunities/conversations/${id}/messages`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: draft }),
      },
    );
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setError(data.error);
    setMessages((current) =>
      current.some((item) => item.id === data.message.id)
        ? current
        : [...current, data.message],
    );
    setDraft("");
  };
  const action = async (name: string) => {
    if (
      ["leave", "block"].includes(name) &&
      !window.confirm(
        `${name === "leave" ? "Leave" : "Block"} this conversation?`,
      )
    )
      return;
    const response = await fetch(`/api/opportunities/conversations/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: name }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error);
    if (["leave", "archive"].includes(name)) router.push("/messages");
    else load();
  };
  if (loading) return <p>Loading conversation…</p>;
  if (!conversation)
    return (
      <p role="alert" className="text-destructive">
        {error || "Conversation not found."}
      </p>
    );
  const memberName = (senderId: string) =>
    conversation.participants?.find(
      (person: any) => person.user_id === senderId,
    )?.display_name || "LeadPilot member";
  return (
    <Card className="mx-auto flex h-[calc(100vh-9rem)] max-w-5xl flex-col overflow-hidden">
      <CardHeader className="border-b p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon">
              <Link href="/messages">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="font-semibold">{conversation.other_name}</h1>
              <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                {conversation.participants?.map((person: any) => (
                  <span
                    key={person.user_id}
                    className="inline-flex items-center gap-1 capitalize"
                  >
                    {person.display_name} ({person.participant_role})
                    {person.is_verified && (
                      <VerificationBadge className="scale-75" />
                    )}
                  </span>
                ))}
              </div>
              <Link
                href={`/opportunities/${conversation.opportunity.id}`}
                className="text-xs text-primary hover:underline"
              >
                {conversation.opportunity.title}
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <CommunityReportDialog
              entityType="conversation"
              entityId={conversation.id}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Archive"
              onClick={() => action("archive")}
            >
              <Archive className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={conversation.blocked_by_me ? "Unblock" : "Block"}
              onClick={() =>
                action(conversation.blocked_by_me ? "unblock" : "block")
              }
            >
              <Ban className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Leave"
              onClick={() => action("leave")}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <div
          className="flex-1 space-y-3 overflow-y-auto p-4"
          aria-live="polite"
        >
          {messages.length ? (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.sender_id === currentUserId
                    ? "justify-end"
                    : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2 text-sm sm:max-w-[70%]",
                    message.sender_id === currentUserId
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  <p className="mb-1 text-[10px] font-medium opacity-70">
                    {memberName(message.sender_id)}
                  </p>
                  <p className="whitespace-pre-wrap break-words">
                    {message.message}
                  </p>
                  <p className="mt-1 text-[10px] opacity-70">
                    {new Date(message.created_at).toLocaleString("en-NG")}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Start the private conversation about this opportunity.
            </p>
          )}
          <div ref={bottom} />
        </div>
        {error && (
          <p
            role="alert"
            className="border-t bg-destructive/10 px-4 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <Textarea
              aria-label="Message"
              maxLength={4000}
              rows={2}
              className="min-h-10 resize-none"
              disabled={
                conversation.blocked || conversation.status !== "active"
              }
              placeholder={
                conversation.blocked
                  ? "Messaging is disabled for this conversation."
                  : "Write a message"
              }
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
            />
            <Button
              size="icon"
              disabled={busy || !draft.trim() || conversation.blocked}
              onClick={send}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
