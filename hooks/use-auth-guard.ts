"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";

const PUBLIC_ROUTES = ["/", "/auth/login", "/auth/signup"];
const AUTH_ROUTES = ["/dashboard", "/search", "/leads", "/lead", "/settings", "/team"];

export function useAuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const user = localStorage.getItem("user");
    const isAuth = !!user;
    setIsAuthenticated(isAuth);

    const isPublic = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith("/auth/"));
    const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

    if (!isAuth && isAuthRoute) {
      router.push("/auth/login");
    }

    if (isAuth && (pathname === "/auth/login" || pathname === "/auth/signup")) {
      router.push("/dashboard");
    }
  }, [pathname, router]);

  return { isAuthenticated };
}
