"use client";
import * as React from "react";
import type { AppNotification } from "@/types/notification";
export function useNotifications() {
  const [items, setItems] = React.useState<AppNotification[]>([]),
    [loading, setLoading] = React.useState(true),
    [error, setError] = React.useState("");
  const load = React.useCallback(async () => {
    try {
      const r = await fetch("/api/notifications", { cache: "no-store" }),
        d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not load notifications.");
      setItems(d.notifications || []);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load notifications.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  React.useEffect(() => {
    void load();
    const listener = () => void load(),
      timer = window.setInterval(listener, 30000);
    window.addEventListener("leadpilot:notifications-updated", listener);
    return () => {
      clearInterval(timer);
      window.removeEventListener("leadpilot:notifications-updated", listener);
    };
  }, [load]);
  const sync = () =>
    window.dispatchEvent(new Event("leadpilot:notifications-updated"));
  async function markRead(id: string) {
    setItems((x) => x.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    const r = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!r.ok) {
      await load();
      return false;
    }
    sync();
    return true;
  }
  async function markAll() {
    setItems((x) => x.map((n) => ({ ...n, is_read: true })));
    const r = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all" }),
    });
    if (!r.ok) {
      await load();
      return false;
    }
    sync();
    return true;
  }
  return {
    items,
    loading,
    error,
    unreadCount: items.filter((n) => !n.is_read).length,
    markRead,
    markAll,
  };
}
