import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWebsitePromptEntitlement } from "@/lib/website-prompt-entitlement";
import { WebsitePromptAccessGate } from "@/components/website-prompt/access-gate";

export default async function WebsitePromptBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const entitlement = await getWebsitePromptEntitlement(supabase, user);
  return (
    <WebsitePromptAccessGate entitlement={entitlement}>
      {children}
    </WebsitePromptAccessGate>
  );
}
