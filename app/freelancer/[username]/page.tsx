import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Briefcase,
  Calendar,
  ExternalLink,
  GraduationCap,
  Mail,
  MapPin,
  Star,
} from "lucide-react";
import { getPublicFreelancer } from "@/lib/public-freelancer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformLink } from "@/components/freelancer/platform-link";
import { RatingSummary } from "@/components/freelancer/rating-summary";
import { ShareProfile } from "@/components/freelancer/share-profile";
import { VerificationBadge } from "@/components/freelancer/verification-badge";

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  try {
    const data = await getPublicFreelancer(params.username);
    if (!data) return { title: "Freelancer not found" };
    const { profile, ratings } = data;
    const name = profile.displayName || profile.fullName;
    const description =
      `${profile.professionalTitle}${ratings.total ? ` · ${ratings.average.toFixed(1)} stars from ${ratings.total} verified client reviews` : ""}. ${profile.shortBio}`.slice(
        0,
        160,
      );
    return {
      title: `${name} | LeadPilot AI`,
      description,
      openGraph: {
        title: `${name} — ${profile.professionalTitle}`,
        description,
        type: "profile",
        images: profile.profileImageUrl
          ? [{ url: profile.profileImageUrl }]
          : [],
      },
      twitter: {
        card: "summary_large_image",
        title: `${name} — ${profile.professionalTitle}`,
        description,
        images: profile.profileImageUrl ? [profile.profileImageUrl] : [],
      },
    };
  } catch {
    return { title: "LeadPilot AI Freelancer" };
  }
}

export default async function FreelancerPage({
  params,
}: {
  params: { username: string };
}) {
  let data;
  try {
    data = await getPublicFreelancer(params.username);
  } catch {
    data = null;
  }
  if (!data) notFound();
  const { profile, portfolio, reviews, ratings, socialLinks } = data;
  const name = profile.displayName || profile.fullName;
  const location = [profile.city, profile.country].filter(Boolean).join(", ");
  const contactHref =
    profile.preferredContactMethod === "whatsapp" && profile.contactPhone
      ? `https://wa.me/${profile.contactPhone.replace(/\D/g, "")}`
      : profile.contactEmail
        ? `mailto:${profile.contactEmail}?subject=${encodeURIComponent(`Project enquiry for ${name}`)}`
        : `/contact?freelancer=${profile.username}`;
  return (
    <main className="min-h-screen bg-muted/20 pb-16">
      <div className="mx-auto max-w-6xl">
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-500 sm:h-64">
          {profile.coverImageUrl && (
            <img
              src={profile.coverImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="px-4 sm:px-8">
          <section className="relative -mt-16 rounded-2xl border bg-card p-5 shadow-xl sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <Avatar className="h-28 w-28 border-4 border-background shadow-lg sm:h-36 sm:w-36">
                <AvatarImage
                  src={profile.profileImageUrl || undefined}
                  alt={name}
                />
                <AvatarFallback className="text-3xl">
                  {name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
                  {profile.isLeadPilotVerified && (
                    <VerificationBadge />
                  )}
                </div>
                <p className="mt-1 text-lg text-muted-foreground">
                  {profile.professionalTitle}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {location && (
                    <span className="inline-flex items-center">
                      <MapPin className="mr-1 h-4 w-4" />
                      {location}
                    </span>
                  )}
                  {profile.visibility.availability && (
                    <Badge
                      variant={
                        profile.availabilityStatus === "available"
                          ? "default"
                          : "secondary"
                      }
                      className="capitalize"
                    >
                      {profile.availabilityStatus}
                    </Badge>
                  )}
                  <span className="inline-flex items-center">
                    <Star className="mr-1 h-4 w-4 fill-amber-400 text-amber-400" />
                    {ratings.total
                      ? `${ratings.average.toFixed(1)} (${ratings.total})`
                      : "No reviews yet"}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Button asChild>
                  <a
                    href={contactHref}
                    target={
                      contactHref.startsWith("http") ? "_blank" : undefined
                    }
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Contact Freelancer
                  </a>
                </Button>
                <ShareProfile name={name} title={profile.professionalTitle} />
              </div>
            </div>
            {profile.shortBio && (
              <p className="mt-6 max-w-3xl text-base leading-relaxed">
                {profile.shortBio}
              </p>
            )}
          </section>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-8">
              {profile.fullBio && (
                <Card>
                  <CardHeader>
                    <CardTitle>About</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-line leading-7 text-muted-foreground">
                      {profile.fullBio}
                    </p>
                  </CardContent>
                </Card>
              )}
              {(profile.skills.length > 0 || profile.services.length > 0) && (
                <Card>
                  <CardContent className="grid gap-6 p-6 sm:grid-cols-2">
                    <div>
                      <h2 className="mb-3 font-semibold">Skills</h2>
                      <div className="flex flex-wrap gap-2">
                        {profile.skills.map((skill) => (
                          <Badge key={skill} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h2 className="mb-3 font-semibold">Services offered</h2>
                      <div className="flex flex-wrap gap-2">
                        {profile.services.map((service) => (
                          <Badge key={service}>{service}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {portfolio.length > 0 && (
                <section>
                  <h2 className="mb-4 text-2xl font-bold">Portfolio</h2>
                  <div className="grid gap-5 sm:grid-cols-2">
                    {portfolio.map((project) => (
                      <Card key={project.id} className="overflow-hidden">
                        {project.coverImageUrl && (
                          <img
                            src={project.coverImageUrl}
                            alt={project.projectTitle}
                            className="aspect-video w-full object-cover"
                          />
                        )}
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold">
                              {project.projectTitle}
                            </h3>
                            <Badge variant="outline">{project.category}</Badge>
                          </div>
                          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                            {project.description}
                          </p>
                          {project.projectImages.length > 0 && (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              {project.projectImages.slice(0, 6).map((image) => (
                                <a key={image} href={image} target="_blank" rel="noopener noreferrer">
                                  <img src={image} alt={`${project.projectTitle} detail`} className="aspect-video w-full rounded-md object-cover" />
                                </a>
                              ))}
                            </div>
                          )}
                          <div className="mt-3 flex flex-wrap gap-1">
                            {project.skillsUsed.map((skill) => (
                              <Badge
                                key={skill}
                                variant="secondary"
                                className="text-xs"
                              >
                                {skill}
                              </Badge>
                            ))}
                          </div>
                          {(project.projectUrl || project.externalUrl) && (
                            <a
                              href={
                                project.projectUrl || project.externalUrl || "#"
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-4 inline-flex items-center text-sm font-medium text-primary"
                            >
                              View project{" "}
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}
              {profile.workExperience.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Briefcase className="mr-2 h-5 w-5" />
                      Work experience
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {profile.workExperience.map((item, index) => (
                      <div
                        key={item.id || index}
                        className="border-l-2 border-primary/30 pl-4"
                      >
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.organization} ·{" "}
                          {[item.startDate, item.endDate || "Present"]
                            .filter(Boolean)
                            .join(" – ")}
                        </p>
                        <p className="mt-1 text-sm">{item.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              {(profile.education.length > 0 ||
                profile.certifications.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <GraduationCap className="mr-2 h-5 w-5" />
                      Education & certifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profile.education.map((item, index) => (
                      <div key={item.id || index}>
                        <h3 className="font-semibold">{item.qualification}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.school}
                          {item.field ? ` · ${item.field}` : ""}
                        </p>
                      </div>
                    ))}
                    {profile.certifications.map((item, index) => (
                      <div key={item.id || index}>
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.issuer}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              <section>
                <h2 className="mb-4 text-2xl font-bold">
                  Verified client reviews
                </h2>
                <Card>
                  <CardContent className="p-6">
                    <RatingSummary ratings={ratings} />
                  </CardContent>
                </Card>
                <div className="mt-4 space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold">
                              {review.clientName}
                              {review.clientCompany
                                ? ` · ${review.clientCompany}`
                                : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {review.projectTitle}
                            </p>
                          </div>
                          <Badge variant="secondary">
                            Verified Client Review
                          </Badge>
                        </div>
                        <div className="my-3 flex">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`}
                            />
                          ))}
                        </div>
                        <p className="leading-relaxed">{review.reviewText}</p>
                        <p className="mt-3 text-xs text-muted-foreground">
                          <Calendar className="mr-1 inline h-3 w-3" />
                          {new Date(review.createdAt).toLocaleDateString(
                            "en-NG",
                          )}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                  {!reviews.length && (
                    <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                      No approved client reviews yet.
                    </p>
                  )}
                </div>
              </section>
            </div>
            <aside className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>Professional details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {profile.yearsOfExperience !== null && (
                    <p>
                      <strong>{profile.yearsOfExperience}</strong> years of
                      experience
                    </p>
                  )}
                  {profile.hourlyRate !== null && (
                    <p>
                      From{" "}
                      <strong>
                        ₦{profile.hourlyRate.toLocaleString("en-NG")}/hour
                      </strong>
                    </p>
                  )}
                  {profile.startingPrice !== null && (
                    <p>
                      Projects from{" "}
                      <strong>
                        ₦{profile.startingPrice.toLocaleString("en-NG")}
                      </strong>
                    </p>
                  )}
                  {profile.languages.length > 0 && (
                    <p>
                      <strong>Languages:</strong> {profile.languages.join(", ")}
                    </p>
                  )}
                  {profile.industries.length > 0 && (
                    <p>
                      <strong>Industries:</strong>{" "}
                      {profile.industries.join(", ")}
                    </p>
                  )}
                </CardContent>
              </Card>
              {socialLinks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Find me online</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {socialLinks.map((link) => (
                      <PlatformLink
                        key={link.id}
                        platform={link.platform}
                        url={link.profileUrl}
                      />
                    ))}
                  </CardContent>
                </Card>
              )}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-5 text-sm">
                  <p className="font-semibold">Hire with confidence</p>
                  <p className="mt-1 text-muted-foreground">
                    Reviews marked verified were submitted through single-use
                    client links. LeadPilot AI does not guarantee outcomes.
                  </p>
                  <Button asChild variant="link" className="mt-2 px-0">
                    <Link href="/terms">Learn more</Link>
                  </Button>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
