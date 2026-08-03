export const DEFAULT_AUTH_REDIRECT = "/dashboard";

const SAFE_REDIRECT_BASE = "https://leadpilot.local";

/** Accepts application-relative destinations only. */
export function getSafeRedirectPath(
  requestedPath: string | null | undefined,
  fallback = DEFAULT_AUTH_REDIRECT,
): string {
  if (
    !requestedPath ||
    !requestedPath.startsWith("/") ||
    requestedPath.startsWith("//") ||
    requestedPath.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(requestedPath)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(requestedPath, SAFE_REDIRECT_BASE);
    if (parsed.origin !== SAFE_REDIRECT_BASE) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
