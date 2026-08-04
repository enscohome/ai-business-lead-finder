import { notFound } from "next/navigation";
import { requireControlCentre } from "@/lib/control-centre";
import { ControlCentreDashboard } from "@/components/admin/control-centre-dashboard";

export default async function OwnerControlCentrePage() {
  const auth = await requireControlCentre();
  if (!auth) notFound();
  return <ControlCentreDashboard />;
}
