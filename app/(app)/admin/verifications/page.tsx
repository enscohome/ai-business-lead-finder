import { notFound } from "next/navigation";
import { requireControlCentre } from "@/lib/control-centre";
import { VerificationReviewQueue } from "@/components/admin/verification-review-queue";

export default async function VerificationReviewPage() {
  const auth = await requireControlCentre();
  if (!auth) notFound();
  return <VerificationReviewQueue />;
}
