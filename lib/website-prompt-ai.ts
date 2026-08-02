import type {
  PromptOutputs,
  WebsitePromptFormData,
} from "@/types/website-prompt";
import { buildPromptOutputs } from "@/lib/website-prompt";

export async function generateWebsitePrompts(data: WebsitePromptFormData) {
  const fallback = buildPromptOutputs(data);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    return { outputs: fallback, source: "structured-template" as const };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_PROMPT_BUILDER_MODEL || "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.35,
        max_tokens: 6000,
        messages: [
          {
            role: "system",
            content:
              "You improve website specifications. Return JSON with exactly four string properties: codex, claude, kimi, general. Preserve every supplied fact, never fabricate details, clearly label optional assumptions, keep all security and delivery instructions, and make each target meaningfully different.",
          },
          {
            role: "user",
            content: `Polish these four already-structured drafts without removing requirements:\n${JSON.stringify(fallback)}`,
          },
        ],
      }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("AI provider request failed");
    const payload = await response.json();
    const parsed = JSON.parse(payload.choices?.[0]?.message?.content || "{}");
    const keys: Array<keyof PromptOutputs> = [
      "codex",
      "claude",
      "kimi",
      "general",
    ];
    if (
      !keys.every(
        (key) =>
          typeof parsed[key] === "string" && parsed[key].trim().length > 200,
      )
    ) {
      throw new Error("AI provider returned an incomplete result");
    }
    return { outputs: parsed as PromptOutputs, source: "openai" as const };
  } catch {
    return { outputs: fallback, source: "structured-template" as const };
  }
}
