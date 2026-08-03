"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { getSafeRedirectPath } from "@/lib/auth/safe-redirect";
import { getAuthCallbackUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface GoogleAuthButtonProps {
  nextPath?: string;
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M21.35 12.25c0-.64-.06-1.12-.18-1.62H12v3.25h5.38a4.6 4.6 0 0 1-2 3.02l-.02.11 2.91 2.25.2.02c1.85-1.7 2.88-4.22 2.88-7.03Z"
      />
      <path
        fill="#34A853"
        d="M12 21.75c2.64 0 4.86-.87 6.48-2.38l-3.1-2.4c-.83.56-1.95.95-3.38.95a5.87 5.87 0 0 1-5.55-4.05l-.1.01-3.02 2.34-.04.1A9.79 9.79 0 0 0 12 21.75Z"
      />
      <path
        fill="#FBBC05"
        d="M6.45 13.87A6 6 0 0 1 6.12 12c0-.65.12-1.28.32-1.87v-.12L3.38 7.64l-.1.05A9.77 9.77 0 0 0 2.25 12c0 1.56.37 3.03 1.03 4.31l3.17-2.44Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.08c1.84 0 3.08.8 3.8 1.46l2.75-2.68A9.31 9.31 0 0 0 12 2.25a9.79 9.79 0 0 0-8.72 5.44l3.16 2.44A5.9 5.9 0 0 1 12 6.08Z"
      />
    </svg>
  );
}

export function GoogleAuthButton({
  nextPath = "/dashboard",
}: GoogleAuthButtonProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const errorId = React.useId();

  const handleGoogleSignIn = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage("");

    try {
      const safeNextPath = getSafeRedirectPath(nextPath);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getAuthCallbackUrl(safeNextPath),
        },
      });
      if (error) throw error;
    } catch {
      setErrorMessage(
        "Google sign-in could not start. Check your connection and try again.",
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        aria-busy={isLoading}
        aria-describedby={errorMessage ? errorId : undefined}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <span className="mr-2" aria-hidden="true">
            <GoogleIcon />
          </span>
        )}
        {isLoading ? "Connecting to Google..." : "Continue with Google"}
      </Button>

      {errorMessage ? (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="text-center text-sm text-destructive"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
