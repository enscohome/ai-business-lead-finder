"use client";
import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NotificationItem } from "@/components/notifications/notification-item";
import { useNotifications } from "@/hooks/use-notifications";
export default function Notifications() {
  const { items, loading, error, unreadCount, markRead, markAll } =
      useNotifications(),
    [notice, setNotice] = React.useState("");
  React.useEffect(
    () =>
      setNotice(
        new URLSearchParams(window.location.search).get("notice") || "",
      ),
    [],
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "You are all caught up."}
          </p>
        </div>
        <Button
          variant="outline"
          disabled={!unreadCount}
          onClick={() => void markAll()}
        >
          Mark all as read
        </Button>
      </div>
      {notice === "destination-unavailable" && (
        <p
          role="status"
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700"
        >
          That related page is not available in this version. The notification
          was marked as read.
        </p>
      )}
      {notice === "update-failed" && (
        <p role="alert" className="text-sm text-destructive">
          The notification could not be marked as read. Please try again.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {loading ? (
        <p>Loading notifications...</p>
      ) : !items.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No notifications yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y p-2">
            {items.map((n) => (
              <NotificationItem key={n.id} notification={n} onRead={markRead} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
