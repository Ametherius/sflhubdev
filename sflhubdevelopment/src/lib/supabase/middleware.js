// src/lib/supabase/middleware.js (example pattern)
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

function applyCookies(response, cookiesToSet) {
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  return response;
}

function isPrefetch(request) {
  const purpose = (
    request.headers.get("purpose") ||
    request.headers.get("sec-purpose") ||
    ""
  ).toLowerCase();
  return (
    request.headers.has("next-router-prefetch") ||
    request.headers.has("next-router-segment-prefetch") ||
    request.headers.get("x-middleware-prefetch") === "1" ||
    purpose.includes("prefetch")
  );
}

export async function updateSession(request) {
  // Prefetch loads several pages at once. Each one would refresh the same
  // login, and the second refresh revokes the session.
  if (isPrefetch(request)) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const pendingCookies = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          pendingCookies.splice(0, pendingCookies.length, ...cookiesToSet);
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          applyCookies(response, cookiesToSet);
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // protect sections by prefix
  const protectedPrefixes = [
    "/dashboard",
    "/schedule",
    "/planner",
    "/samsara",
    "/motive",
  ];

  const isProtected = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // A redirect built from scratch drops the refreshed session cookie.
    // The browser then keeps the old token and the next refresh is logged out.
    return applyCookies(NextResponse.redirect(url), pendingCookies);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return applyCookies(NextResponse.redirect(url), pendingCookies);
  }

  return response;
}
