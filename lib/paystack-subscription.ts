import { getPlan, type PlanId } from "@/lib/plans";
import {
  getSubscriptionDetails,
  subscriptionPeriod,
  type PaystackTransaction,
} from "@/lib/paystack";

export async function activatePaystackPlan(
  admin: any,
  userId: string,
  planId: Exclude<PlanId, "free">,
  transaction: PaystackTransaction,
) {
  const plan = getPlan(planId);
  const subscription = getSubscriptionDetails(transaction);
  const period = subscriptionPeriod(
    transaction.paid_at,
    subscription.next_payment_date,
  );
  const { error } = await admin
    .from("user_profiles")
    .update({
      plan: plan.id,
      searches_today: 0,
      searches_limit: plan.searchesPerMonth,
      leads_limit: plan.savedLeads,
      ai_messages_used: 0,
      website_prompt_generations_used: 0,
      csv_exports_used: 0,
      usage_period_start: period.start,
      usage_period_end: period.end,
      paystack_customer_code: transaction.customer?.customer_code || null,
      paystack_subscription_code: subscription.subscription_code || null,
      paystack_email_token: subscription.email_token || null,
      paystack_transaction_reference: transaction.reference,
      subscription_status: "active",
      previous_paid_plan: null,
      subscription_current_period_start: period.start,
      subscription_current_period_end: period.end,
      subscription_cancel_at_period_end: false,
    })
    .eq("id", userId);
  if (error) throw error;
}

export async function returnToFreePlan(
  admin: any,
  selector: {
    userId?: string;
    subscriptionCode?: string;
    customerCode?: string;
    email?: string;
  },
  status: string,
) {
  const plan = getPlan("free");
  let lookup = admin.from("user_profiles").select("id,plan");
  if (selector.userId) lookup = lookup.eq("id", selector.userId);
  else if (selector.subscriptionCode)
    lookup = lookup.eq("paystack_subscription_code", selector.subscriptionCode);
  else if (selector.customerCode)
    lookup = lookup.eq("paystack_customer_code", selector.customerCode);
  else if (selector.email) lookup = lookup.eq("email", selector.email);
  else return;
  const { data: profile, error: lookupError } = await lookup.maybeSingle();
  if (lookupError) throw lookupError;
  if (!profile) return;
  const previousPaidPlan =
    profile.plan && profile.plan !== "free" ? profile.plan : null;
  const query = admin
    .from("user_profiles")
    .update({
      plan: "free",
      previous_paid_plan: previousPaidPlan,
      searches_today: 0,
      searches_limit: plan.searchesPerMonth,
      leads_limit: plan.savedLeads,
      ai_messages_used: 0,
      csv_exports_used: 0,
      subscription_status: status,
      subscription_current_period_end: new Date().toISOString(),
      subscription_cancel_at_period_end: false,
    })
    .eq("id", profile.id);
  const { error } = await query;
  if (error) throw error;
}
