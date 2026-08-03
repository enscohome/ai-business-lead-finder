import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ensureUserProfile } from "@/lib/auth/ensure-user-profile";
import { getSafeRedirectPath } from "@/lib/auth/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function redirectToLogin(request: NextRequest, errorCode: string) {
  const loginUrl = new URL("/auth/login", request.nextUrl.origin);
  loginUrl.searchParams.set("error", errorCode);
  return NextResponse.redirect(loginUrl, 303);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = getSafeRedirectPath(request.nextUrl.searchParams.get("next"));

  if (!code) {
    return redirectToLogin(request, "oauth_callback_missing_code");
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return redirectToLogin(request, "oauth_callback_failed");
  }

  try {
    await ensureUserProfile(supabase, data.user);
  } catch (profileError) {
    console.error("OAuth profile provisioning failed", profileError);
    await supabase.auth.signOut();
    return redirectToLogin(request, "oauth_profile_failed");
  }

  return NextResponse.redirect(new URL(next, request.nextUrl.origin), 303);
}
