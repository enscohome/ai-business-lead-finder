export async function recordAutomationRequest(
  supabase: any,
  userId: string,
  eventType: "plan_requested" | "request_started",
) {
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count, error } = await supabase
    .from("automation_workflow_generation_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("event_type", ["plan_requested", "request_started"])
    .gte("created_at", oneMinuteAgo);
  if (error)
    return {
      ok: false,
      status: 503,
      error:
        "AI Automation Builder storage is not configured yet. Apply the reviewed migration before using this feature.",
    } as const;
  if ((count || 0) >= 5)
    return {
      ok: false,
      status: 429,
      error: "Too many automation requests. Please wait a minute and try again.",
    } as const;
  const { error: insertError } = await supabase
    .from("automation_workflow_generation_events")
    .insert({
      user_id: userId,
      event_type: eventType,
      validation_status: "not_validated",
      details: {},
    });
  if (insertError)
    return {
      ok: false,
      status: 503,
      error: "Could not record the automation request safely.",
    } as const;
  return { ok: true } as const;
}
