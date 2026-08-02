import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enforceCountryFeature } from "@/lib/country-access";
import { ensureSubscriptionProfile } from "@/lib/subscription";
import { getPlan } from "@/lib/plans";
import {
  sanitizeWebsitePromptInput,
  validateWebsitePromptInput,
} from "@/lib/website-prompt";
import { generateWebsitePrompts } from "@/lib/website-prompt-ai";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "You must be logged in to generate a website prompt." },
      { status: 401 },
    );

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const data = sanitizeWebsitePromptInput((body as any)?.formData);
  const errors = validateWebsitePromptInput(data);
  if (errors.length)
    return NextResponse.json({ error: errors[0], errors }, { status: 400 });

  const access = await enforceCountryFeature(
    supabase,
    user,
    "website_prompt_builder",
    data.countryCode,
  );
  if (!access.allowed) return access.response;

  try {
    const profile = await ensureSubscriptionProfile(supabase, user);
    const plan = getPlan(profile.plan);
    const used = profile.ai_messages_used || 0;
    if (used >= plan.aiMessagesPerMonth) {
      return NextResponse.json(
        {
          error: `You have reached your ${plan.name} AI generation limit for this month.`,
          upgradeUrl: "/pricing",
        },
        { status: 429 },
      );
    }

    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count } = await supabase
      .from("website_prompt_generation_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneMinuteAgo);
    if ((count || 0) >= 5) {
      return NextResponse.json(
        {
          error:
            "Too many generation requests. Please wait a minute and try again.",
        },
        { status: 429 },
      );
    }

    const result = await generateWebsitePrompts(data);
    const { data: consumed, error: usageError } = await supabase.rpc(
      "consume_website_prompt_allowance",
      {
        p_user_id: user.id,
        p_limit: plan.aiMessagesPerMonth,
      },
    );
    if (usageError || !consumed) {
      return NextResponse.json(
        {
          error: "Your AI allowance was reached or could not be recorded.",
          upgradeUrl: "/pricing",
        },
        { status: usageError ? 503 : 429 },
      );
    }
    await supabase
      .from("website_prompt_generation_events")
      .insert({ user_id: user.id });
    return NextResponse.json({
      outputs: result.outputs,
      source: result.source,
      usage: { used: used + 1, limit: plan.aiMessagesPerMonth },
    });
  } catch {
    return NextResponse.json(
      { error: "Website prompt generation is temporarily unavailable." },
      { status: 500 },
    );
  }
}
