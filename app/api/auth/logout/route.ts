import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth";
import { safeReturnPath } from "@/lib/safe-redirect";
import { endSession } from "@/lib/services/auth";

/**
 * Signs the current user out and deletes the session server-side, so a copied
 * cookie stops working too. POST only, so a link or image cannot trigger it.
 */
export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const returnPath = safeReturnPath(formData?.get("returnPath")?.toString(), "/");
  const token = request.headers.get("cookie")?.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`))?.[1];
  await endSession(token ? decodeURIComponent(token) : null).catch(() => undefined);

  const response = NextResponse.redirect(new URL(returnPath, request.url), { status: 303 });
  response.cookies.set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions, maxAge: 0 });
  return response;
}
