import { createHmac, timingSafeEqual } from "crypto";
import { getPlan, isPlanId, type PlanId } from "@/lib/plans";

const PAYSTACK_API = "https://api.paystack.co";

type PaidPlanId = Exclude<PlanId, "free">;

export interface PaystackTransaction {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at?: string;
  metadata?: { user_id?: string; plan?: string } | string | null;
  customer?: { customer_code?: string; email?: string };
  plan_code?: string;
  plan?: { plan_code?: string } | string | null;
  subscription?: { subscription_code?: string; email_token?: string; next_payment_date?: string } | string | null;
}

export interface PaystackEvent {
  event: string;
  data: PaystackTransaction & {
    plan_code?: string;
    subscription_code?: string;
    email_token?: string;
    next_payment_date?: string;
    customer?: { customer_code?: string; email?: string };
  };
}

export function getPaystackPlanCode(plan: PaidPlanId) {
  const codes: Record<PaidPlanId, string | undefined> = {
    starter: process.env.PAYSTACK_STARTER_PLAN_CODE,
    pro: process.env.PAYSTACK_PRO_PLAN_CODE,
    agency: process.env.PAYSTACK_AGENCY_PLAN_CODE,
  };
  return codes[plan];
}

export function getPlanFromPaystackCode(code?: string | null): PaidPlanId | null {
  if (!code) return null;
  return (["starter", "pro", "agency"] as PaidPlanId[]).find(plan => getPaystackPlanCode(plan) === code) || null;
}

export function getTransactionPlanCode(transaction: PaystackTransaction) {
  return transaction.plan_code || (typeof transaction.plan === "string" ? transaction.plan : transaction.plan?.plan_code);
}

export function getSubscriptionDetails(transaction: PaystackTransaction) {
  return typeof transaction.subscription === "string"
    ? { subscription_code: transaction.subscription }
    : transaction.subscription || {};
}

export function parseMetadata(metadata: PaystackTransaction["metadata"]) {
  if (typeof metadata === "string") {
    try { return JSON.parse(metadata) as { user_id?: string; plan?: string }; } catch { return {}; }
  }
  return metadata || {};
}

export function isPaystackTestConfigurationReady(plan: PaidPlanId) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  return Boolean(secret?.startsWith("sk_test_") && getPaystackPlanCode(plan));
}

export async function paystackRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret?.startsWith("sk_test_")) throw new Error("PAYSTACK_TEST_CONFIGURATION_REQUIRED");
  const response = await fetch(`${PAYSTACK_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const text = await response.text();
  let payload: { status?: boolean; message?: string; data?: T } = {};
  if (text) { try { payload = JSON.parse(text); } catch { throw new Error("PAYSTACK_INVALID_RESPONSE"); } }
  if (!response.ok || !payload.status || !payload.data) throw new Error(payload.message || "PAYSTACK_REQUEST_FAILED");
  return payload.data;
}

export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret?.startsWith("sk_test_") || !signature) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const received = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
}

export function isSuccessfulPlanTransaction(transaction: PaystackTransaction, planId: unknown) {
  if (!isPlanId(planId) || planId === "free") return false;
  const plan = getPlan(planId);
  return transaction.status === "success" && transaction.currency === "NGN" && transaction.amount === plan.priceNgn * 100 && getTransactionPlanCode(transaction) === getPaystackPlanCode(planId);
}

export function subscriptionPeriod(paidAt?: string, nextPaymentDate?: string) {
  const start = paidAt && !Number.isNaN(Date.parse(paidAt)) ? new Date(paidAt) : new Date();
  const calculatedEnd = new Date(start);
  calculatedEnd.setUTCMonth(calculatedEnd.getUTCMonth() + 1);
  const end = nextPaymentDate && !Number.isNaN(Date.parse(nextPaymentDate)) ? new Date(nextPaymentDate) : calculatedEnd;
  return { start: start.toISOString(), end: end.toISOString() };
}
