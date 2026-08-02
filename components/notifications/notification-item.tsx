"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types/notification";
export function NotificationItem({
  notification,
  onRead,
  onNavigate,
}: {
  notification: AppNotification;
  onRead: (id: string) => Promise<boolean>;
  onNavigate?: () => void;
}) {
  const router = useRouter(),
    [busy, setBusy] = React.useState(false);
  async function open() {
    if (busy) return;
    setBusy(true);
    const marked = await onRead(notification.id);
    onNavigate?.();
    if (!marked) router.push("/notifications?notice=update-failed");
    else if (notification.destination && notification.destination_available)
      router.push(notification.destination);
    else router.push("/notifications?notice=destination-unavailable");
    setBusy(false);
  }
  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      className={cn(
        "w-full rounded-md p-3 text-left outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
        !notification.is_read && "bg-primary/5",
      )}
      aria-label={`${notification.is_read ? "Read" : "Unread"} notification: ${notification.title}`}
    >
      <span className="flex gap-3">
        {!notification.is_read && (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
        )}
        <span className={cn("min-w-0 flex-1", notification.is_read && "pl-5")}>
          <span
            className={cn(
              "block text-sm",
              !notification.is_read && "font-semibold",
            )}
          >
            {notification.title}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {notification.message}
          </span>
          <span className="mt-1 block text-[11px] text-muted-foreground">
            {new Date(notification.created_at).toLocaleString()}
          </span>
        </span>
      </span>
    </button>
  );
}
