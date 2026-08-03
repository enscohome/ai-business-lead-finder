import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  findSecretFields,
  sanitizeWebsitePromptInput,
  validateWebsitePromptInput,
} from "@/lib/website-prompt";
import { generateWebsitePrompts } from "@/lib/website-prompt-ai";
import {
  entitlementError,
  getWebsitePromptEntitlement,
} from "@/lib/website-prompt-entitlement";

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

  const entitlement = await getWebsitePromptEntitlement(supabase, user);
  if (!entitlement.allowed) {
    const denied = entitlementError(entitlement);
    return NextResponse.json(denied.body, { status: denied.status });
  }

  const data = sanitizeWebsitePromptInput((body as any)?.formData);
  const secretFields = findSecretFields((body as any)?.formData);
  if (secretFields.length)
    return NextResponse.json(
      {
        error:
          "Remove secret or credential-like information before continuing.",
        code: "SECRET_DETECTED",
        fields: secretFields,
      },
      { status: 400 },
    );
  const errors = validateWebsitePromptInput(data);
  if (errors.length)
    return NextResponse.json({ error: errors[0], errors }, { status: 400 });

  try {
    const used = entitlement.generationsUsed;
    if (!entitlement.isOwner && used >= entitlement.generationsLimit) {
      return NextResponse.json(
        {
          error:
            "You have reached your monthly Website Prompt Builder generation limit.",
          code: "MONTHLY_LIMIT_REACHED",
          entitlement,
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
    let consumed = entitlement.generationsUsed;
    if (!entitlement.isOwner) {
      const { data, error: usageError } = await supabase.rpc(
        "consume_website_prompt_generation",
        {
          p_user_id: user.id,
        },
      );
      consumed = data;
      if (usageError || !consumed) {
        return NextResponse.json(
          {
            error:
              "Your monthly prompt allowance was reached or could not be recorded.",
            code: usageError ? "USAGE_UNAVAILABLE" : "MONTHLY_LIMIT_REACHED",
            entitlement,
            upgradeUrl: "/pricing",
          },
          { status: usageError ? 503 : 429 },
        );
      }
    }
    await supabase
      .from("website_prompt_generation_events")
      .insert({ user_id: user.id });
    return NextResponse.json({
      outputs: result.outputs,
      source: result.source,
      usage: {
        used: consumed,
        limit: entitlement.isOwner ? null : entitlement.generationsLimit,
        resetAt: entitlement.resetAt,
        unlimited: entitlement.isOwner,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Website prompt generation is temporarily unavailable." },
      { status: 500 },
    );
  }
}
