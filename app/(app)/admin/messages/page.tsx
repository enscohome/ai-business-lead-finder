import { notFound } from "next/navigation";
import { requireControlCentre } from "@/lib/control-centre";
import { OwnerProjectMessages } from "@/components/admin/owner-project-messages";

export default async function OwnerMessagesPage() {
  const auth = await requireControlCentre();
  if (!auth) notFound();
  return <OwnerProjectMessages />;
}
