import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy, createScriptNonce } from "@/lib/content-security-policy";

export function middleware(request: NextRequest) {
  const nonce = createScriptNonce();
  const policy = contentSecurityPolicy(nonce, {
    development: process.env.NODE_ENV === "development",
    preview: process.env.VERCEL_ENV === "preview"
  });
  const requestHeaders = new Headers(request.headers);
  // Overwrite client-supplied values. Next reads this CSP to nonce its bootstrap.
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
