import { NextRequest, NextResponse } from "next/server";
import { requireOpportunityUser, databaseUnavailable, sendOpportunityNotification } from "@/lib/job-opportunities-server";
import { enforceCountryFeature } from "@/lib/country-access";
import { isLeadPilotVerified, getControlCentreRole } from "@/lib/control-centre";
import { list, rateLimitWindow } from "@/lib/job-opportunities";
import { safeExternalUrl, sanitizeText } from "@/lib/freelancer";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
async function uploadDocuments(auth: NonNullable<Awaited<ReturnType<typeof requireOpportunityUser>>>, files: File[]) {
  const references: string[] = [];
  for (const file of files.slice(0, 5)) {
    if (!ALLOWED.has(file.type) || file.size > 10 * 1024 * 1024)
      throw new Error("Verification documents must be JPG, PNG, WebP or PDF files smaller than 10 MB.");
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const path = `${auth.user.id}/professional/${crypto.randomUUID()}.${ext}`;
    const { error } = await auth.supabase.storage.from("verification-private").upload(path, file, { contentType: file.type });
    if (error) throw new Error("Private verification storage is not configured yet.");
    references.push(path);
  }
  return references;
}

export async function GET() {
  const auth = await requireOpportunityUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = await getControlCentreRole(auth.admin, auth.user.id);
  if (role === "owner") return NextResponse.json({ status: "approved", isVerified: true, isOwner: true, application: null });
  const [{ data: application, error }, verified] = await Promise.all([
    auth.admin.from("verification_applications").select("id,professional_name,professional_category,years_experience,main_skills,portfolio_links,professional_links,additional_information,status,change_request_reason,rejection_reason,reviewed_at,created_at,updated_at").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    isLeadPilotVerified(auth.admin, auth.user.id),
  ]);
  if (error && databaseUnavailable(error)) return NextResponse.json({ error: "Verification migration has not been applied yet." }, { status: 503 });
  return NextResponse.json({ status: verified ? "approved" : application?.status || "not_applied", isVerified: verified, isOwner: false, application });
}

export async function POST(request: NextRequest) {
  const auth = await requireOpportunityUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = await getControlCentreRole(auth.admin, auth.user.id);
  if (role === "owner") return NextResponse.json({ error: "The LeadPilot owner is verified through the permanent owner role and cannot submit an application." }, { status: 409 });
  const access = await enforceCountryFeature(auth.supabase, auth.user, "verification");
  if (!access.allowed) return access.response;
  try {
    const form = await request.formData();
    const [{ data: profile }, { data: active }, { count }] = await Promise.all([
      auth.admin.from("freelancer_profiles").select("id,profile_completion_percentage,professional_title,full_bio,skills,services,country,city").eq("user_id", auth.user.id).maybeSingle(),
      auth.admin.from("verification_applications").select("*").eq("user_id", auth.user.id).in("status", ["pending", "under_review", "changes_requested"]).maybeSingle(),
      auth.admin.from("verification_applications").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id).gte("created_at", rateLimitWindow(24 * 90)),
    ]);
    if (!profile) return NextResponse.json({ error: "Create your freelancer profile first." }, { status: 400 });
    if ((profile.profile_completion_percentage || 0) < 60 || !profile.professional_title || !(profile.skills || []).length)
      return NextResponse.json({ error: "Complete at least 60% of your freelancer profile, including a title and skills, before applying." }, { status: 400 });
    if (active && active.status !== "changes_requested") return NextResponse.json({ error: "A verification application is already active." }, { status: 409 });
    if (!active && (count || 0) >= 3) return NextResponse.json({ error: "Verification application limit reached. Please wait before applying again." }, { status: 429 });

    const professionalName = sanitizeText(form.get("professionalName"), 160);
    const reason = sanitizeText(form.get("reason"), 3000);
    const category = sanitizeText(form.get("professionalCategory"), 120);
    const years = Number(form.get("yearsExperience"));
    const skills = list(form.get("mainSkills"), 30, 80);
    const portfolioLinks = list(form.get("portfolioLinks"), 10, 500).map((url) => safeExternalUrl(url)).filter(Boolean);
    const professionalLinks = list(form.get("professionalLinks"), 10, 500).map((url) => safeExternalUrl(url)).filter(Boolean);
    const additional = sanitizeText(form.get("additionalInformation"), 5000);
    if (professionalName.length < 2 || reason.length < 20 || category.length < 2 || !Number.isInteger(years) || years < 0 || years > 80 || !skills.length)
      return NextResponse.json({ error: "Complete every required verification field with valid professional information." }, { status: 400 });
    const files = [...form.getAll("documents"), form.get("document"), form.get("selfie")].filter((value): value is File => value instanceof File && value.size > 0);
    const documentReferences = await uploadDocuments(auth, files);
    const values = {
      professional_name: professionalName, reason, professional_category: category,
      years_experience: years, main_skills: skills, portfolio_links: portfolioLinks,
      professional_links: professionalLinks, additional_information: additional,
      document_references: active ? [...(active.document_references || []), ...documentReferences].slice(-10) : documentReferences,
      status: "pending", change_request_reason: null, rejection_reason: null,
      reviewed_by: null, reviewed_at: null,
    };
    let application: any;
    if (active?.status === "changes_requested") {
      const result = await auth.admin.from("verification_applications").update(values).eq("id", active.id).eq("user_id", auth.user.id).eq("status", "changes_requested").select("*").single();
      if (result.error) throw result.error;
      application = result.data;
    } else {
      const result = await auth.admin.from("verification_applications").insert({ ...values, user_id: auth.user.id }).select("*").single();
      if (result.error) throw result.error;
      application = result.data;
    }
    await auth.admin.from("verification_events").insert({ user_id: auth.user.id, application_id: application.id, moderator_id: null, action: active ? "resubmitted" : "submitted", reason: "Application submitted by freelancer" });
    await sendOpportunityNotification(auth.admin, { userId: auth.user.id, type: "verification_application_received", title: "Verification application received", message: "Your LeadPilot Verified application is awaiting manual review.", entityType: "verification_application_status", entityId: application.id, deduplicationKey: `verification-submitted:${application.id}:${application.updated_at}` });
    const { data: reviewers } = await auth.admin.from("app_admins").select("user_id").in("role", ["owner", "admin", "moderator"]);
    await Promise.all((reviewers || []).filter((reviewer: any) => reviewer.user_id !== auth.user.id).map((reviewer: any) => sendOpportunityNotification(auth.admin, { userId: reviewer.user_id, type: "verification_application", title: active ? "Verification application resubmitted" : "New verification application", message: `${professionalName} submitted professional information for manual review.`, entityType: "verification_application", entityId: application.id, deduplicationKey: `verification-reviewer:${application.id}:${application.updated_at}:${reviewer.user_id}` })));
    return NextResponse.json({ application, status: "pending" }, { status: active ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: databaseUnavailable(error) ? "Verification migration has not been applied yet." : error instanceof Error ? error.message : "Could not submit verification." }, { status: 400 });
  }
}
