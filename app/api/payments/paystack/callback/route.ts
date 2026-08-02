import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPaystackPlanCode,
  isSuccessfulPlanTransaction,
  parseMetadata,
  paystackRequest,
  type PaystackTransaction,
} from "@/lib/paystack";
import { activatePaystackPlan } from "@/lib/paystack-subscription";
import { isPlanId } from "@/lib/plans";

function pricingRedirect(request: NextRequest, result: string) {
  return NextResponse.redirect(
    new URL(`/pricing?payment=${result}`, request.nextUrl.origin),
  );
}

export async function GET(request: NextRequest) {
  const reference =
    request.nextUrl.searchParams.get("reference") ||
    request.nextUrl.searchParams.get("trxref");
  if (!reference || !process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_test_"))
    return pricingRedirect(request, "failed");
  try {
    const transaction = await paystackRequest<PaystackTransaction>(
      `/transaction/verify/${encodeURIComponent(reference)}`,
    );
    const metadata = parseMetadata(transaction.metadata);
    const admin = createAdminClient();
    if (
      !metadata.user_id ||
      !isPlanId(metadata.plan) ||
      metadata.plan === "free" ||
      !getPaystackPlanCode(metadata.plan) ||
      !isSuccessfulPlanTransaction(transaction, metadata.plan)
    )
      return pricingRedirect(request, "failed");
    const { data: existing } = await admin
      .from("user_profiles")
      .select("paystack_transaction_reference")
      .eq("id", metadata.user_id)
      .maybeSingle();
    if (existing?.paystack_transaction_reference !== transaction.reference)
      await activatePaystackPlan(
        admin,
        metadata.user_id,
        metadata.plan,
        transaction,
      );
    return pricingRedirect(request, "success");
  } catch (error) {
    console.error(
      "Paystack callback verification failed",
      error instanceof Error ? error.message : "Unknown verification error",
    );
    return pricingRedirect(request, "failed");
  }
}
