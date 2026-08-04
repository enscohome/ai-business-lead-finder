import { notFound } from "next/navigation";
import { requireControlCentre } from "@/lib/control-centre";
import { ManagedOpportunityDetails } from "@/components/admin/managed-opportunity-details";

export default async function ManagedOpportunityPage({ params }: { params: { id: string } }) {
  const auth = await requireControlCentre();
  if (!auth) notFound();
  return <ManagedOpportunityDetails id={params.id} />;
}
