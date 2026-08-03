import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAutomationBuilderEntitlement } from "@/lib/automation-builder/entitlement";
import { AutomationBuilderAccessGate } from "@/components/automation-builder/access-gate";

export default async function AutomationBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const entitlement = await getAutomationBuilderEntitlement(supabase, user);
  return (
    <AutomationBuilderAccessGate entitlement={entitlement}>
      {children}
    </AutomationBuilderAccessGate>
  );
}
