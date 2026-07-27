import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { safeReturnPath } from "@/lib/safe-redirect";

/**
 * Signs the current user out.
 *
 * POST only: a GET would let any page trigger a sign-out by embedding an image,
 * and browsers may prefetch it. Server actions carry Next's origin check; this
 * route is reached from a plain form post, so the same-site session cookie plus
 * the POST requirement is what stops a cross-site trigger.
 */
export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const returnPath = safeReturnPath(formData?.get("returnPath")?.toString(), "/");

  const response = NextResponse.redirect(new URL(returnPath, request.url), {
    // 303 so the browser follows with GET rather than repeating the POST.
    status: 303
  });

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  return response;
}
