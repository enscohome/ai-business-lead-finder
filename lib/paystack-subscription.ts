import { getPlan, type PlanId } from "@/lib/plans";
import { getSubscriptionDetails, subscriptionPeriod, type PaystackTransaction } from "@/lib/paystack";

export async function activatePaystackPlan(admin: any, userId: string, planId: Exclude<PlanId, "free">, transaction: PaystackTransaction) {
  const plan = getPlan(planId);
  const subscription = getSubscriptionDetails(transaction);
  const period = subscriptionPeriod(transaction.paid_at, subscription.next_payment_date);
  const { error } = await admin.from("user_profiles").update({
    plan: plan.id,
    searches_today: 0,
    searches_limit: plan.searchesPerMonth,
    leads_limit: plan.savedLeads,
    ai_messages_used: 0,
    csv_exports_used: 0,
    usage_period_start: period.start,
    usage_period_end: period.end,
    paystack_customer_code: transaction.customer?.customer_code || null,
    paystack_subscription_code: subscription.subscription_code || null,
    paystack_email_token: subscription.email_token || null,
    paystack_transaction_reference: transaction.reference,
    subscription_status: "active",
    subscription_current_period_end: period.end,
  }).eq("id", userId);
  if (error) throw error;
}

export async function returnToFreePlan(admin: any, selector: { userId?: string; subscriptionCode?: string; customerCode?: string; email?: string }, status: string) {
  const plan = getPlan("free");
  let query = admin.from("user_profiles").update({ plan: "free", searches_today: 0, searches_limit: plan.searchesPerMonth, leads_limit: plan.savedLeads, ai_messages_used: 0, csv_exports_used: 0, subscription_status: status, subscription_current_period_end: new Date().toISOString() });
  if (selector.userId) query = query.eq("id", selector.userId);
  else if (selector.subscriptionCode) query = query.eq("paystack_subscription_code", selector.subscriptionCode);
  else if (selector.customerCode) query = query.eq("paystack_customer_code", selector.customerCode);
  else if (selector.email) query = query.eq("email", selector.email);
  else return;
  const { error } = await query;
  if (error) throw error;
}
