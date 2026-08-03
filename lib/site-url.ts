const LOCAL_DEVELOPMENT_ORIGIN = "http://localhost:3000";

function normalizeOrigin(value: string | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(
      candidate.startsWith("http://") || candidate.startsWith("https://")
        ? candidate
        : `https://${candidate}`,
    );
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Uses the active browser origin for OAuth and public environment settings for
 * server-side callers, so local, preview, and production redirects stay valid.
 */
export function getSiteOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;

  return (
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeOrigin(process.env.NEXT_PUBLIC_VERCEL_URL) ??
    LOCAL_DEVELOPMENT_ORIGIN
  );
}

export function getAuthCallbackUrl(nextPath = "/dashboard"): string {
  const callbackUrl = new URL("/auth/callback", getSiteOrigin());
  callbackUrl.searchParams.set("next", nextPath);
  return callbackUrl.toString();
}
