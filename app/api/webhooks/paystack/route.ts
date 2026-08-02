import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPlanFromPaystackCode,
  getSubscriptionDetails,
  getTransactionPlanCode,
  isSuccessfulPlanTransaction,
  parseMetadata,
  subscriptionPeriod,
  verifyPaystackSignature,
  type PaystackEvent,
} from "@/lib/paystack";
import {
  activatePaystackPlan,
  returnToFreePlan,
} from "@/lib/paystack-subscription";
import { isPlanId } from "@/lib/plans";
import { getOwnerAccess } from "@/lib/owner-access";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (
    !verifyPaystackSignature(
      rawBody,
      request.headers.get("x-paystack-signature"),
    )
  )
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  let payload: PaystackEvent;
  try {
    payload = JSON.parse(rawBody) as PaystackEvent;
  } catch {
    return NextResponse.json(
      { error: "Invalid event payload." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const eventKey = createHash("sha256")
    .update(`${payload.event}:${rawBody}`)
    .digest("hex");
  const { error: eventError } = await admin
    .from("processed_payment_events")
    .insert({
      provider: "paystack",
      event_key: eventKey,
      event_type: payload.event,
    });
  if (eventError?.code === "23505")
    return NextResponse.json({ received: true, duplicate: true });
  if (eventError)
    return NextResponse.json(
      { error: "Payment event storage is not configured." },
      { status: 503 },
    );

  try {
    const data = payload.data;
    const metadata = parseMetadata(data.metadata);
    const eventPlanCode = data.plan_code || getTransactionPlanCode(data);
    const metadataPlan =
      isPlanId(metadata.plan) && metadata.plan !== "free"
        ? metadata.plan
        : null;
    const planId = metadataPlan || getPlanFromPaystackCode(eventPlanCode);
    const subscription = getSubscriptionDetails(data);
    const selector = {
      userId: metadata.user_id,
      subscriptionCode:
        data.subscription_code || subscription.subscription_code,
      customerCode: data.customer?.customer_code,
      email: data.customer?.email,
    };
    let resolvedUserId = metadata.user_id;
    if (!resolvedUserId) {
      let lookup = admin.from("user_profiles").select("id");
      if (selector.subscriptionCode)
        lookup = lookup.eq(
          "paystack_subscription_code",
          selector.subscriptionCode,
        );
      else if (selector.customerCode)
        lookup = lookup.eq("paystack_customer_code", selector.customerCode);
      else if (selector.email) lookup = lookup.eq("email", selector.email);
      else lookup = lookup.eq("id", "00000000-0000-0000-0000-000000000000");
      const { data: matchedProfile } = await lookup.maybeSingle();
      resolvedUserId = matchedProfile?.id;
    }

    if (resolvedUserId && (await getOwnerAccess(admin, resolvedUserId)).isOwner)
      return NextResponse.json({ received: true, ownerAccessPreserved: true });

    if (
      payload.event === "charge.success" &&
      resolvedUserId &&
      planId &&
      isSuccessfulPlanTransaction(data, planId)
    ) {
      await activatePaystackPlan(admin, resolvedUserId, planId, data);
    } else if (payload.event === "subscription.create") {
      const period = subscriptionPeriod(data.paid_at, data.next_payment_date);
      let query = admin.from("user_profiles").update({
        paystack_customer_code: data.customer?.customer_code || null,
        paystack_subscription_code: data.subscription_code || null,
        paystack_email_token: data.email_token || null,
        subscription_status: "active",
        subscription_current_period_start: period.start,
        subscription_current_period_end: period.end,
        subscription_cancel_at_period_end: false,
        usage_period_start: period.start,
        usage_period_end: period.end,
      });
      if (metadata.user_id) query = query.eq("id", metadata.user_id);
      else if (data.customer?.email)
        query = query.eq("email", data.customer.email);
      else return NextResponse.json({ received: true });
      const { error } = await query;
      if (error) throw error;
    } else if (payload.event === "subscription.disable") {
      let query = admin.from("user_profiles").update({
        subscription_status: "cancelled",
        subscription_cancel_at_period_end: true,
      });
      if (selector.userId) query = query.eq("id", selector.userId);
      else if (selector.subscriptionCode)
        query = query.eq(
          "paystack_subscription_code",
          selector.subscriptionCode,
        );
      else if (selector.customerCode)
        query = query.eq("paystack_customer_code", selector.customerCode);
      else if (selector.email) query = query.eq("email", selector.email);
      else return NextResponse.json({ received: true });
      const { error } = await query;
      if (error) throw error;
    } else if (
      ["invoice.payment_failed", "charge.failed"].includes(payload.event)
    ) {
      await returnToFreePlan(admin, selector, "past_due");
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(
      "Paystack webhook processing failed",
      error instanceof Error ? error.message : "Unknown webhook error",
    );
    await admin
      .from("processed_payment_events")
      .delete()
      .eq("event_key", eventKey);
    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 },
    );
  }
}
