import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlan, isPlanId } from "@/lib/plans";
import { getPaystackPlanCode, isPaystackTestConfigurationReady, paystackRequest } from "@/lib/paystack";

const SETUP_MESSAGE = "Payment setup is not complete yet.";
const jsonError = (message: string, status: number, code: string) => NextResponse.json({ error: message, code }, { status });

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return jsonError("The checkout request was not valid JSON.", 400, "INVALID_REQUEST"); }
    const planId = typeof body === "object" && body !== null && "plan" in body ? (body as { plan?: unknown }).plan : undefined;
    if (!isPlanId(planId) || planId === "free") return jsonError("Choose Starter, Pro or Agency to continue.", 400, "INVALID_PLAN");
    if (!isPaystackTestConfigurationReady(planId)) return jsonError(SETUP_MESSAGE, 503, "PAYMENT_SETUP_INCOMPLETE");

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.email) return jsonError("Please sign in before upgrading.", 401, "AUTH_REQUIRED");
    const { error: migrationError } = await supabase.from("user_profiles").select("subscription_status, paystack_customer_code").eq("id", user.id).limit(1);
    if (migrationError) return jsonError(SETUP_MESSAGE, 503, "PAYMENT_SETUP_INCOMPLETE");

    const plan = getPlan(planId);
    const callbackUrl = `${request.nextUrl.origin}/api/payments/paystack/callback`;
    const initialized = await paystackRequest<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({ email: user.email, amount: plan.priceNgn * 100, currency: "NGN", plan: getPaystackPlanCode(planId), callback_url: callbackUrl, metadata: { user_id: user.id, plan: plan.id } }),
    });
    if (!initialized.authorization_url) return jsonError("Paystack did not return a checkout address.", 502, "CHECKOUT_URL_MISSING");
    return NextResponse.json({ url: initialized.authorization_url, reference: initialized.reference, provider: "paystack", mode: "test" });
  } catch (error) {
    console.error("Paystack checkout failed", error instanceof Error ? error.message : "Unknown checkout error");
    return jsonError("Payment setup is not complete yet. Please try again later.", 503, "CHECKOUT_UNAVAILABLE");
  }
}
