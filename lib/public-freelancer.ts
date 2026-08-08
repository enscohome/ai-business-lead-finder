import { createAdminClient } from "@/lib/supabase/admin";
import { mapProfile, ratingSummary } from "@/lib/freelancer";
import type { PublicFreelancerProfile } from "@/types/freelancer";
import { isLeadPilotVerified } from "@/lib/control-centre";

export async function getPublicFreelancer(
  username: string,
): Promise<PublicFreelancerProfile | null> {
  const admin = createAdminClient();
  let { data: row } = await admin
    .from("freelancer_profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .eq("profile_visibility", "public")
    .maybeSingle();
  if (!row) {
    const { data: alias } = await admin
      .from("freelancer_username_history")
      .select("freelancer_id")
      .eq("old_username", username.toLowerCase())
      .maybeSingle();
    if (alias)
      ({ data: row } = await admin
        .from("freelancer_profiles")
        .select("*")
        .eq("id", alias.freelancer_id)
        .eq("profile_visibility", "public")
        .maybeSingle());
  }
  if (!row) return null;
  const [
    { data: privateRow },
    { data: links },
    { data: projects },
    { data: reviews },
  ] = await Promise.all([
    admin
      .from("freelancer_private_details")
      .select("contact_email,contact_phone")
      .eq("freelancer_id", row.id)
      .maybeSingle(),
    admin
      .from("freelancer_social_links")
      .select("id,platform,profile_url,is_visible")
      .eq("freelancer_id", row.id)
      .eq("is_visible", true),
    admin
      .from("freelancer_portfolio_projects")
      .select("*")
      .eq("freelancer_id", row.id)
      .eq("is_visible", true)
      .order("display_order"),
    admin
      .from("freelancer_reviews")
      .select(
        "id,client_name,client_company,project_title,rating,review_text,verification_status,moderation_status,created_at",
      )
      .eq("freelancer_id", row.id)
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false }),
  ]);
  const verified = await isLeadPilotVerified(admin, row.user_id);
  const profile = mapProfile({
    ...row,
    is_leadpilot_verified: verified,
    contact_email: row.visibility_settings?.email
      ? privateRow?.contact_email
      : "",
    contact_phone: row.visibility_settings?.phone
      ? privateRow?.contact_phone
      : "",
  });
  if (!profile.visibility.location) {
    profile.country = "";
    profile.city = "";
  }
  if (!profile.visibility.hourlyRate) {
    profile.hourlyRate = null;
    profile.startingPrice = null;
  }
  if (!profile.visibility.workExperience) profile.workExperience = [];
  if (!profile.visibility.education) {
    profile.education = [];
    profile.certifications = [];
  }
  if (!profile.visibility.availability)
    profile.availabilityStatus = "unavailable";
  const mappedReviews = (reviews || []).map((review) => ({
    id: review.id,
    clientName: review.client_name,
    clientCompany: review.client_company,
    projectTitle: review.project_title,
    rating: review.rating,
    reviewText: review.review_text,
    verificationStatus: review.verification_status,
    moderationStatus: review.moderation_status,
    createdAt: review.created_at,
  }));
  return {
    profile,
    socialLinks: profile.visibility.socialLinks
      ? (links || []).map((link) => ({
          id: link.id,
          platform: link.platform,
          profileUrl: link.profile_url,
          isVisible: link.is_visible,
        }))
      : [],
    portfolio: (projects || []).map((project) => ({
      id: project.id,
      projectTitle: project.project_title,
      description: project.description,
      coverImageUrl: project.cover_image_url,
      projectImages: project.project_images || [],
      skillsUsed: project.skills_used || [],
      category: project.category,
      clientName: project.client_name,
      completionDate: project.completion_date,
      projectUrl: project.project_url,
      externalUrl: project.external_url,
      displayOrder: project.display_order,
      isVisible: project.is_visible,
    })),
    reviews: mappedReviews,
    ratings: ratingSummary(mappedReviews.map((review) => review.rating)),
  };
}
