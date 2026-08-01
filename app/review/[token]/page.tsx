import type { Metadata } from "next";
import { ReviewForm } from "@/components/freelancer/review-form";
export const metadata: Metadata = {
  title: "Leave a verified client review",
  description:
    "Share honest feedback about a completed freelance project on LeadPilot AI.",
  robots: { index: false, follow: false },
};
export default function ReviewPage({ params }: { params: { token: string } }) {
  return <ReviewForm token={params.token} />;
}
