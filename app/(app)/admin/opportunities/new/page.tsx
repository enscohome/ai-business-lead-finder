import { notFound } from "next/navigation";
import { requireControlCentre } from "@/lib/control-centre";
import { ManagedOpportunityForm } from "@/components/admin/managed-opportunity-form";

export default async function NewManagedOpportunityPage() {
  const auth = await requireControlCentre({ ownerOrAdmin: true });
  if (!auth) notFound();
  return <ManagedOpportunityForm />;
}
