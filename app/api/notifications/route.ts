import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getNotificationDestination,
  isDestinationAvailable,
} from "@/lib/notification-destination";
import { getOwnerAccess } from "@/lib/owner-access";

const ownerHiddenNotificationTypes = new Set([
  "subscription",
  "subscription_created",
  "subscription_cancelled",
  "subscription_expired",
  "payment",
  "payment_success",
  "payment_failed",
  "website_prompt_builder_usage",
  "website_prompt_builder_expired",
]);
export async function GET() {
  const s = createClient(),
    {
      data: { user },
    } = await s.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await s
    .from("notifications")
    .select(
      "id,type,title,message,related_entity_type,related_entity_id,is_read,created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error)
    return NextResponse.json(
      { error: "Notifications are not configured yet." },
      { status: 503 },
    );
  const ownerAccess = await getOwnerAccess(s, user.id);
  const visibleData = ownerAccess.isOwner
    ? (data || []).filter(
        (notification: any) =>
          !ownerHiddenNotificationTypes.has(
            String(notification.type || "").toLowerCase(),
          ) &&
          !["subscription", "payment"].includes(
            String(notification.related_entity_type || "").toLowerCase(),
          ),
      )
    : data || [];
  const notifications = visibleData.map((n: any) => {
    const destination = getNotificationDestination(n);
    return {
      ...n,
      destination,
      destination_available: isDestinationAvailable(destination),
    };
  });
  return NextResponse.json({
    notifications,
    unreadCount: notifications.filter((n) => !n.is_read).length,
  });
}
export async function PATCH(r: NextRequest) {
  const s = createClient(),
    {
      data: { user },
    } = await s.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let b: any;
  try {
    b = await r.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  let q = s
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", user.id);
  if (b.action !== "mark_all") {
    if (typeof b.id !== "string")
      return NextResponse.json(
        { error: "Notification ID required." },
        { status: 400 },
      );
    q = q.eq("id", b.id);
  }
  const { error } = await q;
  if (error)
    return NextResponse.json(
      { error: "Could not update notification." },
      { status: 400 },
    );
  return NextResponse.json({ ok: true });
}
