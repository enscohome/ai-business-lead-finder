import { VerificationApplication } from "@/components/freelancer/verification-application";

export default function ProfileVerificationPage() {
  return <div className="mx-auto max-w-4xl space-y-6"><div><h1 className="text-3xl font-bold">LeadPilot Verified</h1><p className="text-muted-foreground">Apply for a manual review and track the decision securely.</p></div><VerificationApplication /></div>;
}
