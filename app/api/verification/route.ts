import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeExternalUrl, sanitizeText } from "@/lib/freelancer";
import { enforceCountryFeature } from "@/lib/country-access";

const allowed = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
async function upload(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  file: File,
  kind: string,
) {
  if (!allowed.has(file.type) || file.size > 10 * 1024 * 1024)
    throw new Error(
      "Documents must be JPG, PNG, WebP or PDF files smaller than 10 MB.",
    );
  const ext =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${userId}/${kind}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("verification-private")
    .upload(path, file, { contentType: file.type });
  if (error)
    throw new Error("Private verification storage is not configured yet.");
  return path;
}
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase
    .from("freelancer_profiles")
    .select("id,verification_status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile)
    return NextResponse.json({ application: null, status: "not_verified" });
  const { data } = await supabase
    .from("freelancer_verification_applications")
    .select("id,application_status,submitted_at,reviewed_at,rejection_reason")
    .eq("freelancer_id", profile.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return NextResponse.json({
    application: data,
    status: profile.verification_status,
  });
}
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await enforceCountryFeature(supabase, user, "verification");
  if (!access.allowed) return access.response;
  try {
    const form = await request.formData();
    const document = form.get("document");
    const selfie = form.get("selfie");
    if (!(document instanceof File) || !(selfie instanceof File))
      return NextResponse.json(
        { error: "An identity document and selfie are required." },
        { status: 400 },
      );
    const { data: profile } = await supabase
      .from("freelancer_profiles")
      .select("id,verification_status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile)
      return NextResponse.json(
        { error: "Create your freelancer profile first." },
        { status: 400 },
      );
    if (["pending", "verified"].includes(profile.verification_status))
      return NextResponse.json(
        { error: "A verification application is already pending or approved." },
        { status: 409 },
      );
    const [documentPath, selfiePath] = await Promise.all([
      upload(supabase, user.id, document, "documents"),
      upload(supabase, user.id, selfie, "selfies"),
    ]);
    const linkedin = safeExternalUrl(String(form.get("linkedinUrl") || ""));
    const { error } = await supabase
      .from("freelancer_verification_applications")
      .insert({
        freelancer_id: profile.id,
        legal_name: sanitizeText(form.get("legalName"), 160),
        country: sanitizeText(form.get("country"), 80),
        phone_number: sanitizeText(form.get("phoneNumber"), 40),
        email_address: sanitizeText(
          form.get("emailAddress") || user.email,
          254,
        ),
        document_type: sanitizeText(form.get("documentType"), 60),
        document_storage_path: documentPath,
        selfie_storage_path: selfiePath,
        linkedin_url: linkedin || null,
        professional_evidence: [
          { description: sanitizeText(form.get("professionalEvidence"), 2000) },
        ],
        application_status: "pending",
      });
    if (error) throw error;
    await createAdminClient()
      .from("freelancer_profiles")
      .update({ verification_status: "pending" })
      .eq("id", profile.id);
    return NextResponse.json({ submitted: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not submit verification.",
      },
      { status: 400 },
    );
  }
}
